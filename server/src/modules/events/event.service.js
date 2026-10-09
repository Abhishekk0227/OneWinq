import crypto from 'crypto';
import { Event } from './event.model.js';
import { EventRegistration } from './eventRegistration.model.js';
import { recordOrgAudit } from '../organizations/organizationAuditLog.service.js';
import { EVENT_STATUS, EVENT_REGISTRATION_STATUS } from '../../config/constants.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../shared/errors.js';

function generateTicketCode() {
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `OWQ-EVT-${rand}`;
}

export function checkEventEligibility(event, member) {
  if (!event.eligibility || event.eligibility.type === 'ALL') {
    return true;
  }

  if (event.eligibility.type === 'DEPARTMENTS') {
    if (!member.departmentId) return false;
    const allowedDepts = (event.eligibility.departmentIds || []).map((id) => id.toString());
    return allowedDepts.includes(member.departmentId.toString());
  }

  if (event.eligibility.type === 'ROLES') {
    const allowedRoles = event.eligibility.roleIds || [];
    return allowedRoles.includes(member.role);
  }

  return true;
}

export async function createEvent(organizationId, userId, data) {
  const event = await Event.create({
    organizationId,
    title: data.title,
    slug: (data.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80),
    category: data.category || 'ALL_HANDS',
    description: data.description || '',
    bannerUrl: data.bannerUrl || null,
    location: data.location || { type: 'VIRTUAL', venue: '', meetingUrl: '' },
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
    maxCapacity: data.maxCapacity ? Number(data.maxCapacity) : null,
    eligibility: data.eligibility || { type: 'ALL', departmentIds: [], roleIds: [] },
    status: data.status || EVENT_STATUS.PUBLISHED,
    createdBy: userId,
  });

  await recordOrgAudit(organizationId, userId, {
    action: 'EVENT_CREATED',
    targetType: 'Event',
    targetId: event._id.toString(),
    details: { title: event.title, category: event.category },
  });

  return event;
}

export async function listEvents(organizationId, { member, status, page = 1, limit = 20 } = {}) {
  const filter = { organizationId };
  if (status && status !== 'ALL') {
    filter.status = status;
  }

  const events = await Event.find(filter)
    .sort({ startDate: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const total = await Event.countDocuments(filter);

  // Mark if current member is eligible or registered
  return {
    events: events.map((e) => {
      const isEligible = member ? checkEventEligibility(e, member) : true;
      return {
        id: e._id.toString(),
        title: e.title,
        slug: e.slug,
        category: e.category,
        description: e.description,
        bannerUrl: e.bannerUrl,
        location: e.location,
        startDate: e.startDate,
        endDate: e.endDate,
        maxCapacity: e.maxCapacity,
        registeredCount: e.registeredCount,
        eligibility: e.eligibility,
        status: e.status,
        isEligible,
        createdAt: e.createdAt,
      };
    }),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

export async function registerForEvent(organizationId, eventId, userId, member) {
  const event = await Event.findOne({ _id: eventId, organizationId });
  if (!event) {
    throw new NotFoundError('Event not found');
  }

  if (event.status !== EVENT_STATUS.PUBLISHED) {
    throw new BadRequestError('Event is not open for registration');
  }

  if (event.endDate < new Date()) {
    throw new BadRequestError('Event has already concluded');
  }

  // Check eligibility
  if (member && !checkEventEligibility(event, member)) {
    throw new ForbiddenError('You are not eligible to register for this event based on department or role policy');
  }

  // Check capacity
  if (event.maxCapacity !== null && event.registeredCount >= event.maxCapacity) {
    throw new BadRequestError('Event has reached maximum capacity');
  }

  // Check existing registration
  let registration = await EventRegistration.findOne({ eventId: event._id, userId });
  if (registration) {
    if (registration.status === EVENT_REGISTRATION_STATUS.REGISTERED) {
      throw new BadRequestError('You are already registered for this event');
    } else {
      registration.status = EVENT_REGISTRATION_STATUS.REGISTERED;
      registration.registeredAt = new Date();
      await registration.save();
      event.registeredCount += 1;
      await event.save();
      return registration;
    }
  }

  // Generate unique pass code
  let ticketCode = generateTicketCode();
  let duplicate = await EventRegistration.findOne({ ticketCode });
  while (duplicate) {
    ticketCode = generateTicketCode();
    duplicate = await EventRegistration.findOne({ ticketCode });
  }

  registration = await EventRegistration.create({
    eventId: event._id,
    organizationId,
    userId,
    ticketCode,
    status: EVENT_REGISTRATION_STATUS.REGISTERED,
  });

  event.registeredCount += 1;
  await event.save();

  await recordOrgAudit(organizationId, userId, {
    action: 'EVENT_REGISTERED',
    targetType: 'EventRegistration',
    targetId: registration._id.toString(),
    details: { eventId: event._id.toString(), ticketCode },
  });

  return registration;
}

export async function cancelRegistration(organizationId, eventId, userId) {
  const registration = await EventRegistration.findOne({ eventId, organizationId, userId });
  if (!registration || registration.status === EVENT_REGISTRATION_STATUS.CANCELLED) {
    throw new NotFoundError('Active registration not found');
  }

  registration.status = EVENT_REGISTRATION_STATUS.CANCELLED;
  await registration.save();

  await Event.findByIdAndUpdate(eventId, { $inc: { registeredCount: -1 } });

  return { success: true };
}

export async function listUserTickets(userId, { organizationId } = {}) {
  const filter = { userId, status: EVENT_REGISTRATION_STATUS.REGISTERED };
  if (organizationId) {
    filter.organizationId = organizationId;
  }

  const registrations = await EventRegistration.find(filter)
    .populate('eventId')
    .sort({ registeredAt: -1 })
    .lean();

  return registrations.map((r) => ({
    id: r._id.toString(),
    ticketCode: r.ticketCode,
    status: r.status,
    registeredAt: r.registeredAt,
    event: r.eventId
      ? {
          id: r.eventId._id.toString(),
          title: r.eventId.title,
          category: r.eventId.category,
          bannerUrl: r.eventId.bannerUrl,
          location: r.eventId.location,
          startDate: r.eventId.startDate,
          endDate: r.eventId.endDate,
        }
      : null,
  }));
}
