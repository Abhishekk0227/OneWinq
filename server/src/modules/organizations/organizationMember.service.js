import crypto, { randomUUID } from 'crypto';
import { OrganizationMember } from './organizationMember.model.js';
import { OrganizationInvitation } from './organizationInvitation.model.js';
import { Organization } from './organization.model.js';
import { Department } from '../departments/department.model.js';
import { User } from '../users/user.model.js';
import { Session } from '../auth/session.model.js';
import { hashPassword } from '../auth/passwordService.js';
import {
  generateAccessToken,
  generateRefreshToken,
  generateTokenFamily,
} from '../auth/tokenService.js';
import { parseDeviceInfo } from '../../utils/deviceInfo.js';
import {
  ACCOUNT_STATE,
  ORGANIZATION_MEMBER_STATUS,
  ORGANIZATION_ROLE,
  DEFAULT_ROLE_PERMISSIONS,
  ERROR_CODE,
  NOTIFICATION_TYPE,
} from '../../config/constants.js';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  ForbiddenError,
} from '../../shared/errors.js';
import { emailService } from '../../infrastructure/email/emailService.js';
import { notificationService } from '../notifications/notification.service.js';
import { socketEmitter } from '../../infrastructure/sockets/socketEmitter.js';
import logger from '../../utils/logger.js';

export function getAppBaseUrl() {
  const envUrl = process.env.APP_URL || '';
  if (process.env.NODE_ENV === 'development' && envUrl.includes('localhost')) {
    return envUrl.replace(/\/+$/, '');
  }
  if (envUrl && !envUrl.includes('vercel.app')) {
    return envUrl.replace(/\/+$/, '');
  }
  return 'https://www.onewinq.com';
}

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
      .sort({ isExecutive: -1, executiveOrder: 1, role: 1, createdAt: -1 })
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
        isExecutive: Boolean(m.isExecutive),
        executivePosition: m.executivePosition || null,
        executiveOrder: Number(m.executiveOrder || 0),
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
 * Update a member's role, department, title, or executive appointments.
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

  // Executive Appointment Controls
  if (updateData.isExecutive !== undefined) {
    member.isExecutive = Boolean(updateData.isExecutive);
  }
  if (updateData.executivePosition !== undefined) {
    member.executivePosition = updateData.executivePosition || null;
  }
  if (updateData.executiveOrder !== undefined) {
    member.executiveOrder = Number(updateData.executiveOrder || 0);
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
 * List all invitations for an organization with status filtering.
 */
export async function listOrganizationInvitations(organizationId, { page = 1, limit = 50, status, q }) {
  const filter = { organizationId };

  if (q && q.trim()) {
    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { email: { $regex: escaped, $options: 'i' } },
      { jobTitle: { $regex: escaped, $options: 'i' } },
    ];
  }

  const now = new Date();

  if (status && status !== 'ALL') {
    if (status === 'EXPIRED') {
      filter.status = 'PENDING';
      filter.expiresAt = { $lte: now };
    } else if (status === 'PENDING') {
      filter.status = 'PENDING';
      filter.expiresAt = { $gt: now };
    } else {
      filter.status = status;
    }
  }

  const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
  const take = Math.max(1, parseInt(limit, 10));

  const [total, rawInvitations] = await Promise.all([
    OrganizationInvitation.countDocuments(filter),
    OrganizationInvitation.find(filter)
      .populate('invitedBy', 'displayName email avatarUrl')
      .populate('departmentId', 'name code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(take)
      .lean(),
  ]);

  const invitations = rawInvitations.map((inv) => {
    let computedStatus = inv.status;
    if (inv.status === 'PENDING' && new Date(inv.expiresAt) <= now) {
      computedStatus = 'EXPIRED';
    }
    const inviter = inv.invitedBy || {};
    const dept = inv.departmentId;

    return {
      id: inv._id.toString(),
      organizationId: inv.organizationId.toString(),
      email: inv.email,
      role: inv.role,
      jobTitle: inv.jobTitle || '',
      departmentId: dept?._id?.toString() || null,
      department: dept ? { id: dept._id.toString(), name: dept.name, code: dept.code } : null,
      invitedBy: inviter._id ? {
        id: inviter._id.toString(),
        displayName: inviter.displayName || 'Team Admin',
        email: inviter.email,
        avatarUrl: inviter.avatarUrl,
      } : null,
      status: computedStatus,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
      updatedAt: inv.updatedAt,
    };
  });

  return {
    invitations,
    pagination: {
      page: parseInt(page, 10),
      limit: take,
      total,
      pages: Math.ceil(total / take),
    },
  };
}

export function getInvitationEmailHtml({ orgName, role, departmentName, inviterName, inviteLink }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to join ${orgName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #09090b; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #18181b; border: 1px solid #27272a; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
          <!-- Header Branding -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; text-align: center; border-bottom: 1px solid #27272a;">
              <div style="font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">
                One<span style="color: #a855f7;">Winq</span>
              </div>
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #a1a1aa; margin-top: 4px;">
                Workforce Identity & Enterprise Platform
              </div>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="font-size: 20px; font-weight: 700; color: #ffffff; margin: 0 0 14px 0; line-height: 1.4;">
                You've been invited to join <span style="color: #c084fc;">${orgName}</span>
              </h1>
              <p style="font-size: 14px; line-height: 1.6; color: #d4d4d8; margin: 0 0 20px 0;">
                ${inviterName ? `<strong>${inviterName}</strong> has invited you` : 'You have been invited'} to join the workforce at <strong>${orgName}</strong> on OneWinq as a <strong>${role}</strong>${departmentName ? ` in the <strong>${departmentName}</strong> department` : ''}.
              </p>

              <!-- Card Box -->
              <table role="presentation" width="100%" style="background-color: #27272a; border-radius: 12px; margin: 0 0 24px 0; padding: 16px;">
                <tr>
                  <td>
                    <div style="font-size: 11px; color: #a1a1aa; text-transform: uppercase; letter-spacing: 1px;">Organization</div>
                    <div style="font-size: 16px; font-weight: 700; color: #ffffff; margin-top: 2px;">${orgName}</div>
                    <div style="font-size: 13px; color: #c084fc; margin-top: 4px;">Role: ${role}</div>
                  </td>
                </tr>
              </table>

              <!-- Action Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td align="center">
                    <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #9333ea, #7c3aed); color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 15px rgba(147, 51, 234, 0.4);">
                      Accept Invitation & Join →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 12px; line-height: 1.5; color: #a1a1aa; text-align: center; margin: 0 0 14px 0;">
                Already have a OneWinq account? You can also review and accept this invitation directly on your OneWinq Dashboard.
              </p>

              <p style="font-size: 11px; color: #71717a; text-align: center; margin: 0; word-break: break-all;">
                Or copy and paste this link in your browser:<br/>
                <a href="${inviteLink}" style="color: #a855f7; text-decoration: underline;">${inviteLink}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px; background-color: #121214; border-top: 1px solid #27272a; text-align: center;">
              <p style="font-size: 11px; color: #71717a; margin: 0;">
                This invitation link will expire in 7 days. If you did not expect this invitation, you can ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Resend an invitation with refreshed expiry and token.
 */
export async function resendInvitation(organizationId, invitationId, invitedByUserId) {
  const invitation = await OrganizationInvitation.findOne({
    _id: invitationId,
    organizationId,
  });

  if (!invitation) {
    throw new NotFoundError('Invitation not found');
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  invitation.tokenHash = tokenHash;
  invitation.expiresAt = expiresAt;
  invitation.status = 'PENDING';
  if (invitedByUserId) {
    invitation.invitedBy = invitedByUserId;
  }
  await invitation.save();

  const [organization, inviterUser, departmentDoc] = await Promise.all([
    Organization.findById(organizationId).select('name slug logoUrl').lean(),
    invitedByUserId ? User.findById(invitedByUserId).select('displayName email avatarUrl').lean() : null,
    invitation.departmentId ? Department.findById(invitation.departmentId).select('name').lean() : null,
  ]);

  const orgName = organization?.name || 'Organization';
  const inviterName = inviterUser?.displayName || 'Team Administrator';
  const departmentName = departmentDoc?.name || '';
  const inviteLink = `${getAppBaseUrl()}/invitation?token=${rawToken}`;

  // In-app notification for existing users on OneWinq (case-insensitive lookup)
  const normalizedEmail = invitation.email.toLowerCase().trim();
  const emailRegex = new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  const targetUser = await User.findOne({ email: emailRegex }).lean();

  if (targetUser) {
    notificationService
      .createNotification({
        recipientId: targetUser._id,
        actorId: invitedByUserId || null,
        type: NOTIFICATION_TYPE.ORGANIZATION_INVITATION,
        title: `Invitation to join ${orgName}`,
        body: `You have an invitation to join ${orgName} as a ${invitation.role}. Review and accept on your dashboard.`,
        entityType: 'organization',
        entityId: organizationId.toString(),
        linkUrl: `/invitation?token=${rawToken}`,
        metadata: {
          organizationId: organizationId.toString(),
          organizationName: orgName,
          role: invitation.role,
          token: rawToken,
        },
      })
      .catch((err) =>
        logger.warn('[Organization] Failed sending in-app notification on resend', { error: err.message }),
      );

    // Real-time socket event to instantly update dashboard/counter
    socketEmitter.emitToUser(targetUser._id.toString(), 'organization_invitation', {
      organizationId: organizationId.toString(),
      organizationName: orgName,
      role: invitation.role,
      token: rawToken,
    });
  }

  // Send branded invitation email
  Promise.resolve()
    .then(() =>
      emailService.sendNotificationEmail({
        to: invitation.email,
        subject: `Reminder: You have been invited to join ${orgName} on OneWinq`,
        html: getInvitationEmailHtml({
          orgName,
          role: invitation.role,
          departmentName,
          inviterName,
          inviteLink,
        }),
        text: `You have been invited to join ${orgName} on OneWinq as a ${invitation.role}. Accept your invitation here: ${inviteLink}`,
      }),
    )
    .catch((err) => {
      logger.error('[Organization] Failed resending invitation email', { error: err?.message, email: invitation.email });
    });

  return {
    invitation: invitation.toSafeObject(),
    inviteLink,
  };
}

/**
 * Revoke a pending invitation.
 */
export async function revokeInvitation(organizationId, invitationId) {
  const invitation = await OrganizationInvitation.findOne({
    _id: invitationId,
    organizationId,
  });

  if (!invitation) {
    throw new NotFoundError('Invitation not found');
  }

  invitation.status = 'REVOKED';
  await invitation.save();

  return {
    success: true,
    message: 'Invitation revoked successfully',
  };
}

/**
 * Get public preview of an invitation by token.
 */
export async function getInvitationPreview(rawToken) {
  if (!rawToken) {
    throw new ValidationError('Invitation token is required');
  }

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const invitation = await OrganizationInvitation.findOne({ tokenHash })
    .populate('invitedBy', 'displayName email avatarUrl')
    .populate('departmentId', 'name code')
    .lean();

  if (!invitation) {
    throw new NotFoundError('Invitation not found or invalid token', ERROR_CODE.INVITATION_INVALID);
  }

  const organization = await Organization.findById(invitation.organizationId)
    .select('name slug logoUrl tagline description website')
    .lean();

  if (!organization) {
    throw new NotFoundError('Organization not found');
  }

  const now = new Date();
  const isExpired = invitation.expiresAt < now;
  let status = invitation.status;
  if (status === 'PENDING' && isExpired) {
    status = 'EXPIRED';
  }

  const existingUser = await User.findOne({ email: invitation.email })
    .select('displayName email username avatarUrl')
    .lean();

  const inviter = invitation.invitedBy || {};
  const dept = invitation.departmentId;

  return {
    invitation: {
      id: invitation._id.toString(),
      email: invitation.email,
      role: invitation.role,
      jobTitle: invitation.jobTitle,
      status,
      isExpired,
      expiresAt: invitation.expiresAt,
    },
    organization: {
      id: organization._id.toString(),
      name: organization.name,
      slug: organization.slug,
      logoUrl: organization.logoUrl,
      tagline: organization.tagline,
      description: organization.description,
      website: organization.website,
    },
    department: dept ? { id: dept._id.toString(), name: dept.name, code: dept.code } : null,
    invitedBy: inviter._id ? {
      id: inviter._id.toString(),
      displayName: inviter.displayName || 'Team Member',
      email: inviter.email,
      avatarUrl: inviter.avatarUrl,
    } : null,
    userExists: Boolean(existingUser),
    existingUser: existingUser ? {
      displayName: existingUser.displayName,
      username: existingUser.username,
      email: existingUser.email,
      avatarUrl: existingUser.avatarUrl,
    } : null,
  };
}

/**
 * Create and dispatch an invitation to join an organization.
 */
export async function inviteMember(organizationId, invitedByUserId, { email, role = ORGANIZATION_ROLE.MEMBER, departmentId = null, jobTitle = '' }) {
  const normalizedEmail = email.toLowerCase().trim();
  const emailRegex = new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

  // Check if already an active member
  const existingUser = await User.findOne({ email: emailRegex }).lean();
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
    { organizationId, email: emailRegex, status: 'PENDING' },
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

  const [organization, inviterUser, departmentDoc] = await Promise.all([
    Organization.findById(organizationId).select('name slug logoUrl').lean(),
    invitedByUserId ? User.findById(invitedByUserId).select('displayName email avatarUrl').lean() : null,
    departmentId ? Department.findById(departmentId).select('name').lean() : null,
  ]);

  const orgName = organization?.name || 'Organization';
  const inviterName = inviterUser?.displayName || 'Team Administrator';
  const departmentName = departmentDoc?.name || '';
  const inviteLink = `${getAppBaseUrl()}/invitation?token=${rawToken}`;

  // In-app notification if invited user is already registered on OneWinq
  if (existingUser) {
    notificationService
      .createNotification({
        recipientId: existingUser._id,
        actorId: invitedByUserId || null,
        type: NOTIFICATION_TYPE.ORGANIZATION_INVITATION,
        title: `Invitation to join ${orgName}`,
        body: `You have been invited to join ${orgName} as a ${role}. Review and accept on your dashboard.`,
        entityType: 'organization',
        entityId: organizationId.toString(),
        linkUrl: `/invitation?token=${rawToken}`,
        metadata: {
          organizationId: organizationId.toString(),
          organizationName: orgName,
          role,
          token: rawToken,
        },
      })
      .catch((err) =>
        logger.warn('[Organization] Failed sending in-app invitation notification', { error: err.message }),
      );

    // Real-time socket event so user's dashboard and notification badges update instantly
    socketEmitter.emitToUser(existingUser._id.toString(), 'organization_invitation', {
      organizationId: organizationId.toString(),
      organizationName: orgName,
      role,
      token: rawToken,
    });
  }

  // Send branded invitation email
  Promise.resolve()
    .then(() =>
      emailService.sendNotificationEmail({
        to: normalizedEmail,
        subject: `You have been invited to join ${orgName} on OneWinq`,
        html: getInvitationEmailHtml({
          orgName,
          role,
          departmentName,
          inviterName,
          inviteLink,
        }),
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
 * Accept an organization invitation using the raw token for authenticated user.
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

/**
 * Accept an organization invitation with inline account registration for non-users.
 */
export async function acceptInvitationWithRegistration({ token, displayName, username, password, req }) {
  if (!token) {
    throw new ValidationError('Invitation token is required');
  }
  if (!displayName || !displayName.trim()) {
    throw new ValidationError('Display name is required');
  }
  if (!username || !username.trim()) {
    throw new ValidationError('Username is required');
  }
  if (!password || password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters long');
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const invitation = await OrganizationInvitation.findOne({
    tokenHash,
    status: 'PENDING',
    expiresAt: { $gt: new Date() },
  });

  if (!invitation) {
    throw new NotFoundError('Invitation is invalid or has expired', ERROR_CODE.INVITATION_INVALID);
  }

  const organization = await Organization.findById(invitation.organizationId);
  if (!organization) {
    throw new NotFoundError('Organization not found');
  }

  const normalizedUsername = username.toLowerCase().trim();
  const normalizedEmail = invitation.email.toLowerCase().trim();

  // Check if email already registered
  const existingUserByEmail = await User.findOne({ email: normalizedEmail });
  if (existingUserByEmail) {
    throw new ConflictError('An account with this email already exists. Please sign in to accept the invitation.');
  }

  // Check username uniqueness
  const existingUserByUsername = await User.findOne({ username: normalizedUsername });
  if (existingUserByUsername) {
    throw new ConflictError('Username is already taken. Please choose another username.');
  }

  const passwordHash = await hashPassword(password);

  const newUser = await User.create({
    email: normalizedEmail,
    displayName: displayName.trim(),
    username: normalizedUsername,
    passwordHash,
    accountState: ACCOUNT_STATE.ACTIVE,
    emailVerified: true,
  });

  // Create organization member
  let member = await OrganizationMember.findOne({
    organizationId: invitation.organizationId,
    userId: newUser._id,
  });

  if (!member) {
    member = await OrganizationMember.create({
      organizationId: invitation.organizationId,
      userId: newUser._id,
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

  // Create session and auth tokens
  const deviceInfo = parseDeviceInfo(req || {});
  const tokenFamily = generateTokenFamily();
  const { rawToken: refreshTokenRaw, hash: refreshTokenHash } = await generateRefreshToken();
  const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session = await Session.create({
    userId: newUser._id,
    tokenFamily,
    refreshTokenHash,
    isActive: true,
    deviceName: deviceInfo?.deviceName || 'Web Browser',
    userAgent: deviceInfo?.userAgent || 'Unknown',
    ipHash: randomUUID(),
    ipPartial: '*.*.*.*',
    expiresAt: refreshExpiry,
    lastUsedAt: new Date(),
  });

  const accessToken = generateAccessToken({
    userId: newUser._id.toString(),
    sessionId: session._id.toString(),
  });

  logger.info(`[Organization] New user ${newUser.email} registered and accepted invitation to ${organization.name}`);

  return {
    accessToken,
    refreshToken: refreshTokenRaw,
    user: {
      id: newUser._id.toString(),
      email: newUser.email,
      displayName: newUser.displayName,
      username: newUser.username,
      avatarUrl: newUser.avatarUrl || null,
      emailVerified: true,
    },
    member: member.toSafeObject(),
    organization: {
      id: organization._id.toString(),
      name: organization.name,
      slug: organization.slug,
    },
  };
}

/**
 * List all pending organization invitations for the currently authenticated user.
 */
export async function listMyPendingInvitations(userEmail) {
  if (!userEmail) return [];
  const normalizedEmail = userEmail.toLowerCase().trim();
  const emailRegex = new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  const now = new Date();

  const invitations = await OrganizationInvitation.find({
    email: emailRegex,
    status: 'PENDING',
    expiresAt: { $gt: now },
  })
    .populate('organizationId', 'name slug logoUrl tagline type')
    .populate('departmentId', 'name code')
    .populate('invitedBy', 'displayName avatarUrl email')
    .sort({ createdAt: -1 })
    .lean();

  return invitations.map((inv) => {
    const org = inv.organizationId;
    const dept = inv.departmentId;
    const inviter = inv.invitedBy;

    return {
      id: inv._id.toString(),
      organizationId: org?._id?.toString() || null,
      organization: org
        ? {
            id: org._id.toString(),
            name: org.name,
            slug: org.slug,
            logoUrl: org.logoUrl || null,
            tagline: org.tagline || '',
            type: org.type,
          }
        : null,
      department: dept
        ? {
            id: dept._id.toString(),
            name: dept.name,
            code: dept.code,
          }
        : null,
      invitedBy: inviter
        ? {
            id: inviter._id.toString(),
            displayName: inviter.displayName || 'Team Member',
            avatarUrl: inviter.avatarUrl || null,
          }
        : null,
      role: inv.role,
      jobTitle: inv.jobTitle || '',
      status: inv.status,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
    };
  });
}

/**
 * Accept a pending invitation directly from the user's dashboard / notifications.
 */
export async function acceptMyPendingInvitation(userId, userEmail, invitationId) {
  const normalizedEmail = userEmail.toLowerCase().trim();
  const emailRegex = new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  const invitation = await OrganizationInvitation.findOne({
    _id: invitationId,
    email: emailRegex,
    status: 'PENDING',
    expiresAt: { $gt: new Date() },
  });

  if (!invitation) {
    throw new NotFoundError('Invitation not found or has expired', ERROR_CODE.INVITATION_INVALID);
  }

  const organization = await Organization.findById(invitation.organizationId);
  if (!organization) {
    throw new NotFoundError('Organization not found');
  }

  let member = await OrganizationMember.findOne({
    organizationId: invitation.organizationId,
    userId,
  });

  if (member && member.status === ORGANIZATION_MEMBER_STATUS.ACTIVE) {
    invitation.status = 'ACCEPTED';
    await invitation.save();
    return { member: member.toSafeObject(), organization: organization.toSafeObject() };
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

  logger.info(`[Organization] User ${userId} accepted pending invitation to ${organization.name}`);

  return { member: member.toSafeObject(), organization: organization.toSafeObject() };
}

/**
 * Decline a pending organization invitation.
 */
export async function declineMyPendingInvitation(userEmail, invitationId) {
  const normalizedEmail = userEmail.toLowerCase().trim();
  const emailRegex = new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  const invitation = await OrganizationInvitation.findOne({
    _id: invitationId,
    email: emailRegex,
    status: 'PENDING',
  });

  if (!invitation) {
    throw new NotFoundError('Invitation not found');
  }

  invitation.status = 'REJECTED';
  await invitation.save();

  return { success: true, message: 'Invitation declined' };
}
