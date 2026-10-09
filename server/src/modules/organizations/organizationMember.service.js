import crypto from 'crypto';
import { OrganizationMember } from './organizationMember.model.js';
import { OrganizationInvitation } from './organizationInvitation.model.js';
import { Organization } from './organization.model.js';
import { User } from '../users/user.model.js';
import {
  ORGANIZATION_MEMBER_STATUS,
  ORGANIZATION_ROLE,
  DEFAULT_ROLE_PERMISSIONS,
  ERROR_CODE,
} from '../../config/constants.js';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  ForbiddenError,
} from '../../shared/errors.js';
import { emailService } from '../../infrastructure/email/emailService.js';
import logger from '../../utils/logger.js';

/**
 * List members of an organization with search and filtering.
 */
export async function listOrganizationMembers(organizationId, { page = 1, limit = 20, departmentId, role, status = ORGANIZATION_MEMBER_STATUS.ACTIVE, q }) {
  const filter = {
    organizationId,
  };

  if (status) {
    filter.status = status;
  }
  if (departmentId) {
    filter.departmentId = departmentId;
  }
  if (role) {
    filter.role = role;
  }

  const skip = (page - 1) * limit;

  // If text query, match against User displayName, username, or email
  if (q && q.trim()) {
    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matchedUsers = await User.find({
      $or: [
        { displayName: { $regex: escaped, $options: 'i' } },
        { username: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
      ],
    }).select('_id').lean();

    filter.userId = { $in: matchedUsers.map((u) => u._id) };
  }

  const [total, members] = await Promise.all([
    OrganizationMember.countDocuments(filter),
    OrganizationMember.find(filter)
      .populate('userId', 'displayName username email avatarUrl accountState')
      .populate('departmentId', 'name code')
      .sort({ role: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    members: members.map((m) => {
      const u = m.userId || {};
      const dept = m.departmentId;
      return {
        id: m._id.toString(),
        userId: u._id?.toString() || null,
        displayName: u.displayName || 'Unknown',
        username: u.username || 'unknown',
        email: u.email || '',
        avatarUrl: u.avatarUrl || null,
        role: m.role,
        jobTitle: m.jobTitle,
        employeeId: m.employeeId,
        department: dept ? { id: dept._id.toString(), name: dept.name, code: dept.code } : null,
        status: m.status,
        joinedAt: m.joinedAt,
      };
    }),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a specific member within an organization.
 */
export async function getOrganizationMember(organizationId, memberId) {
  const member = await OrganizationMember.findOne({
    _id: memberId,
    organizationId,
  })
    .populate('userId', 'displayName username email avatarUrl')
    .populate('departmentId', 'name code');

  if (!member) {
    throw new NotFoundError('Organization member not found');
  }

  return member;
}

/**
 * Update a member's role, department, or title.
 */
export async function updateOrganizationMember(organizationId, memberId, updateData) {
  const member = await OrganizationMember.findOne({ _id: memberId, organizationId });
  if (!member) {
    throw new NotFoundError('Organization member not found');
  }

  // If changing role away from OWNER, ensure there is at least one other active OWNER
  if (member.role === ORGANIZATION_ROLE.OWNER && updateData.role && updateData.role !== ORGANIZATION_ROLE.OWNER) {
    const ownerCount = await OrganizationMember.countDocuments({
      organizationId,
      role: ORGANIZATION_ROLE.OWNER,
      status: ORGANIZATION_MEMBER_STATUS.ACTIVE,
      _id: { $ne: memberId },
    });

    if (ownerCount === 0) {
      throw new ForbiddenError('Cannot change the role of the only organization owner. Transfer ownership first.');
    }
  }

  if (updateData.role && DEFAULT_ROLE_PERMISSIONS[updateData.role]) {
    member.role = updateData.role;
    member.permissions = DEFAULT_ROLE_PERMISSIONS[updateData.role];
  }

  if (updateData.departmentId !== undefined) {
    member.departmentId = updateData.departmentId || null;
  }
  if (updateData.jobTitle !== undefined) {
    member.jobTitle = updateData.jobTitle;
  }
  if (updateData.employeeId !== undefined) {
    member.employeeId = updateData.employeeId;
  }
  if (updateData.status) {
    member.status = updateData.status;
  }

  await member.save();
  return member.toSafeObject();
}

/**
 * Remove a member from the organization (sets status to DEPARTED).
 */
export async function removeOrganizationMember(organizationId, memberId) {
  const member = await OrganizationMember.findOne({ _id: memberId, organizationId });
  if (!member) {
    throw new NotFoundError('Organization member not found');
  }

  if (member.role === ORGANIZATION_ROLE.OWNER) {
    const otherOwners = await OrganizationMember.countDocuments({
      organizationId,
      role: ORGANIZATION_ROLE.OWNER,
      status: ORGANIZATION_MEMBER_STATUS.ACTIVE,
      _id: { $ne: memberId },
    });
    if (otherOwners === 0) {
      throw new ForbiddenError('Cannot remove the sole owner of an organization.');
    }
  }

  member.status = ORGANIZATION_MEMBER_STATUS.DEPARTED;
  await member.save();

  await Organization.findByIdAndUpdate(organizationId, {
    $inc: { membersCount: -1 },
  });

  return { success: true, message: 'Member removed successfully' };
}

/**
 * Create and dispatch an invitation to join an organization.
 */
export async function inviteMember(organizationId, invitedByUserId, { email, role = ORGANIZATION_ROLE.MEMBER, departmentId = null, jobTitle = '' }) {
  const normalizedEmail = email.toLowerCase().trim();

  // Check if already an active member
  const existingUser = await User.findOne({ email: normalizedEmail }).lean();
  if (existingUser) {
    const existingMember = await OrganizationMember.findOne({
      organizationId,
      userId: existingUser._id,
      status: ORGANIZATION_MEMBER_STATUS.ACTIVE,
    });

    if (existingMember) {
      throw new ConflictError('A user with this email is already an active member of this organization');
    }
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Invalidate any prior pending invitations for this email in this org
  await OrganizationInvitation.updateMany(
    { organizationId, email: normalizedEmail, status: 'PENDING' },
    { status: 'REVOKED' },
  );

  const invitation = await OrganizationInvitation.create({
    organizationId,
    email: normalizedEmail,
    role,
    departmentId: departmentId || null,
    jobTitle,
    tokenHash,
    invitedBy: invitedByUserId,
    status: 'PENDING',
    expiresAt,
  });

  const orgName = organization?.name || 'Organization';
  const inviteLink = `${process.env.APP_URL || 'https://one-winq.vercel.app'}/invitation?token=${rawToken}`;

  // Send invitation email safely (non-blocking)
  Promise.resolve()
    .then(() =>
      emailService.sendNotificationEmail({
        to: normalizedEmail,
        subject: `You have been invited to join ${orgName} on OneWinq`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Join ${orgName} on OneWinq</h2>
            <p>You have been invited to join <strong>${orgName}</strong> as a <strong>${role}</strong>.</p>
            <div style="margin: 25px 0;">
              <a href="${inviteLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                Accept Invitation
              </a>
            </div>
            <p style="color: #64748b; font-size: 13px;">This invitation link will expire in 7 days.</p>
          </div>
        `,
        text: `You have been invited to join ${orgName} on OneWinq as a ${role}. Accept your invitation here: ${inviteLink}`,
      }),
    )
    .catch((err) => {
      logger.error('[Organization] Failed sending invitation email', { error: err?.message, email: normalizedEmail });
    });

  return {
    invitation: invitation.toSafeObject(),
    inviteLink,
  };
}

/**
 * Accept an organization invitation using the raw token.
 */
export async function acceptInvitation(userId, rawToken) {
  if (!rawToken) {
    throw new ValidationError('Invitation token is required');
  }

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const invitation = await OrganizationInvitation.findOne({
    tokenHash,
    status: 'PENDING',
    expiresAt: { $gt: new Date() },
  });

  if (!invitation) {
    throw new NotFoundError(
      'Invitation is invalid or has expired',
      ERROR_CODE.INVITATION_INVALID,
    );
  }

  const organization = await Organization.findById(invitation.organizationId);
  if (!organization) {
    throw new NotFoundError('Organization not found');
  }

  // Check if user is already a member
  let member = await OrganizationMember.findOne({
    organizationId: invitation.organizationId,
    userId,
  });

  if (member && member.status === ORGANIZATION_MEMBER_STATUS.ACTIVE) {
    invitation.status = 'ACCEPTED';
    await invitation.save();
    return member.toSafeObject();
  }

  if (member) {
    member.status = ORGANIZATION_MEMBER_STATUS.ACTIVE;
    member.role = invitation.role;
    member.departmentId = invitation.departmentId;
    member.jobTitle = invitation.jobTitle;
    member.permissions = DEFAULT_ROLE_PERMISSIONS[invitation.role] || [];
    await member.save();
  } else {
    member = await OrganizationMember.create({
      organizationId: invitation.organizationId,
      userId,
      role: invitation.role,
      departmentId: invitation.departmentId,
      jobTitle: invitation.jobTitle,
      status: ORGANIZATION_MEMBER_STATUS.ACTIVE,
      permissions: DEFAULT_ROLE_PERMISSIONS[invitation.role] || [],
      invitedBy: invitation.invitedBy,
      joinedAt: new Date(),
    });

    await Organization.findByIdAndUpdate(invitation.organizationId, {
      $inc: { membersCount: 1 },
    });
  }

  invitation.status = 'ACCEPTED';
  await invitation.save();

  logger.info(`[Organization] User ${userId} accepted invitation to ${organization.name}`);

  return member.toSafeObject();
}
