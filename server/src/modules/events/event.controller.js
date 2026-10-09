import * as eventService from './event.service.js';

export const eventController = {
  create: async (req, res, next) => {
    try {
      const event = await eventService.createEvent(
        req.params.organizationId,
        req.user.id,
        req.body
      );
      return res.status(201).json({
        success: true,
        message: 'Event created successfully',
        data: { event },
      });
    } catch (err) {
      next(err);
    }
  },

  list: async (req, res, next) => {
    try {
      const result = await eventService.listEvents(req.params.organizationId, {
        member: req.membership,
        status: req.query.status,
        page: req.query.page,
        limit: req.query.limit,
      });
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  rsvp: async (req, res, next) => {
    try {
      const registration = await eventService.registerForEvent(
        req.params.organizationId,
        req.params.eventId,
        req.user.id,
        req.membership
      );
      return res.status(201).json({
        success: true,
        message: 'RSVP confirmed! Ticket pass issued.',
        data: { registration },
      });
    } catch (err) {
      next(err);
    }
  },

  cancel: async (req, res, next) => {
    try {
      const result = await eventService.cancelRegistration(
        req.params.organizationId,
        req.params.eventId,
        req.user.id
      );
      return res.status(200).json({
        success: true,
        message: 'Event registration cancelled',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  getMyTickets: async (req, res, next) => {
    try {
      const tickets = await eventService.listUserTickets(req.user.id, {
        organizationId: req.params.organizationId || req.query.organizationId,
      });
      return res.status(200).json({
        success: true,
        data: { tickets },
      });
    } catch (err) {
      next(err);
    }
  },
};
