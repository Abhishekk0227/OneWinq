import crypto from 'crypto';
import { OrganizationTransferRequest, ORGANIZATION_TRANSFER_STATUS } from './organizationTransferRequest.model.js';
import { Organization } from './organization.model.js';
import { OrganizationMember } from './organizationMember.model.js';
import { User } from '../users/user.model.js';
import { notificationService } from '../notifications/notification.service.js';
import { emailService } from '../../infrastructure/email/emailService.js';
import { recordOrgAudit } from './organizationAuditLog.service.js';
import {
  ORGANIZATION_ROLE,
  ORGANIZATION_MEMBER_STATUS,
  DEFAULT_ROLE_PERMISSIONS,
  NOTIFICATION_TYPE,
  ERROR_CODE,
} from '../../config/constants.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../shared/errors.js';
import logger from '../../utils/logger.js';

function getTransferEmailHtml({ organizationName, fromName, toName, transferUrl }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0b0f; color: #f4f4f5; margin: 0; padding: 0; }
    .container { max-width: 580px; margin: 32px auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 20px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #7932d9 0%, #4c1d95 100%); padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; color: #ffffff; font-weight: 800; letter-spacing: -0.5px; }
    .content { padding: 32px 28px; font-size: 14px; line-height: 1.6; color: #d4d4d8; }
    .callout { background-color: #27272a; border-left: 4px solid #a855f7; padding: 16px 20px; border-radius: 8px; margin: 20px 0; }
    .btn { display: inline-block; background-color: #9333ea; color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-size: 14px; text-align: center; margin: 24px 0 12px; }
    .footer { padding: 20px 28px 32px; font-size: 12px; color: #71717a; text-align: center; border-top: 1px solid #27272a; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>OneWinq Enterprise</h1>
    </div>
    <div class="content">
      <p>Hello <strong>${toName}</strong>,</p>
      <p><strong>${fromName}</strong> has initiated a request to transfer full ownership of the following organization to you on OneWinq:</p>
      
      <div class="callout">
        <h3 style="margin: 0 0 6px 0; color: #ffffff; font-size: 16px;">${organizationName}</h3>
        <p style="margin: 0; font-size: 13px; color: #a1a1aa;">Role being granted: <strong>OWNER</strong></p>
      </div>

      <p>As the new owner, you will have complete administrative control over all organization profiles, corporate NFC cards, member governance, billing, and settings.</p>
      <p>Upon your acceptance, <strong>${fromName}</strong> will become a standard member of the organization.</p>

      <div style="text-align: center;">
        <a href="${transferUrl}" class="btn">Review & Accept Ownership Transfer</a>
      </div>

      <p style="font-size: 12px; color: #a1a1aa; margin-top: 24px;">This invitation link will expire in 7 days. If you do not wish to accept, you can decline the request using the button above.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} OneWinq. All rights reserved.<br>This is a critical security and governance notification.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export const organizationTransferService = {
  /**
   * Initiate ownership transfer request by the current organization owner.
   */
  async initiateTransfer({ organizationId, fromUserId, toUserIdOrIdentifier, ipAddress, userAgent }) {
    const org = await Organization.findById(organizationId);
    if (!org) {
      throw new NotFoundError('Organization not found', ERROR_CODE.ORGANIZATION_NOT_FOUND);
    }

    // Verify current caller is the owner
    const isOwner = org.ownerId.toString() === fromUserId.toString();
    if (!isOwner) {
      throw new ForbiddenError(
        'Only the current organization owner can transfer ownership',
        ERROR_CODE.ORGANIZATION_PERMISSION_DENIED
      );
    }

    // Resolve target recipient user
    let targetUser = null;
    const identifier = String(toUserIdOrIdentifier || '').trim();

    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      targetUser = await User.findById(identifier);
    }

    if (!targetUser && identifier) {
      targetUser = await User.findOne({
        $or: [
          { email: identifier.toLowerCase() },
          { username: identifier.toLowerCase().replace(/^@+/, '') },
        ],
      });
    }

    if (!targetUser) {
      throw new NotFoundError(
        'Recipient user could not be found by the provided ID, email, or username',
        ERROR_CODE.USER_NOT_FOUND
      );
    }

    if (targetUser._id.toString() === fromUserId.toString()) {
      throw new BadRequestError('You cannot transfer ownership to yourself');
    }

    // Cancel any existing pending transfer requests for this organization
    await OrganizationTransferRequest.updateMany(
      {
        organizationId: org._id,
        status: ORGANIZATION_TRANSFER_STATUS.PENDING,
      },
      {
        $set: {
          status: ORGANIZATION_TRANSFER_STATUS.CANCELLED,
          respondedAt: new Date(),
        },
      }
    );

    // Create fresh transfer request token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const transferRequest = await OrganizationTransferRequest.create({
      organizationId: org._id,
      fromUserId,
      toUserId: targetUser._id,
      token,
      status: ORGANIZATION_TRANSFER_STATUS.PENDING,
      expiresAt,
    });

    const fromUser = await User.findById(fromUserId);
    const clientBaseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const transferUrl = `${clientBaseUrl}/app/organizations/transfer?token=${token}`;

    // 1. Send in-app notification to target user
    try {
      await notificationService.createNotification({
        recipient: targetUser._id,
        actor: fromUserId,
        type: NOTIFICATION_TYPE.ORGANIZATION_TRANSFER_REQUEST,
        title: `Ownership Transfer: ${org.name}`,
        body: `${fromUser?.displayName || fromUser?.username || 'The owner'} has invited you to accept ownership of ${org.name}.`,
        entityType: 'organization',
        entityId: org._id.toString(),
        linkUrl: `/app/organizations/transfer?token=${token}`,
        metadata: {
          organizationId: org._id.toString(),
          organizationName: org.name,
          organizationSlug: org.slug,
          token,
        },
      });
    } catch (notifErr) {
      logger.warn('[OrgTransfer] In-app notification creation failed', { error: notifErr.message });
    }

    // 2. Send email notification to target user
    try {
      if (targetUser.email) {
        await emailService.sendNotificationEmail({
          to: targetUser.email,
          subject: `Action Required: Ownership Transfer Request for ${org.name} on OneWinq`,
          html: getTransferEmailHtml({
            organizationName: org.name,
            fromName: fromUser?.displayName || fromUser?.username || 'The Owner',
            toName: targetUser.displayName || targetUser.username || 'User',
            transferUrl,
          }),
          text: `${fromUser?.displayName || fromUser?.username || 'The owner'} has invited you to accept ownership of ${org.name} on OneWinq. Review and respond here: ${transferUrl}`,
        });
      }
    } catch (emailErr) {
      logger.warn('[OrgTransfer] Email delivery failed', { error: emailErr.message });
    }

    // 3. Record Audit Log
    await recordOrgAudit(org._id, fromUserId, {
      action: 'ORGANIZATION_TRANSFER_INITIATED',
      targetType: 'User',
      targetId: targetUser._id.toString(),
      details: {
        targetUserEmail: targetUser.email,
        targetUsername: targetUser.username,
        requestId: transferRequest._id.toString(),
      },
      ipAddress,
      userAgent,
    });

    return {
      message: 'Ownership transfer request initiated successfully',
      transferRequest: {
        id: transferRequest._id.toString(),
        organizationId: org._id.toString(),
        toUser: {
          id: targetUser._id.toString(),
          displayName: targetUser.displayName,
          username: targetUser.username,
          email: targetUser.email,
          avatarUrl: targetUser.avatarUrl,
        },
        status: transferRequest.status,
        expiresAt: transferRequest.expiresAt,
        createdAt: transferRequest.createdAt,
      },
    };
  },

  /**
   * Get active pending transfer request for an organization.
   */
  async getActiveTransfer(organizationId, userId) {
    const org = await Organization.findById(organizationId);
    if (!org) {
      throw new NotFoundError('Organization not found', ERROR_CODE.ORGANIZATION_NOT_FOUND);
    }

    const pendingRequest = await OrganizationTransferRequest.findOne({
      organizationId: org._id,
      status: ORGANIZATION_TRANSFER_STATUS.PENDING,
      expiresAt: { $gt: new Date() },
    })
      .populate('toUserId', 'displayName username email avatarUrl')
      .populate('fromUserId', 'displayName username email avatarUrl')
      .lean();

    if (!pendingRequest) return null;

    return {
      id: pendingRequest._id.toString(),
      organizationId: org._id.toString(),
      fromUser: pendingRequest.fromUserId,
      toUser: pendingRequest.toUserId,
      status: pendingRequest.status,
      expiresAt: pendingRequest.expiresAt,
      createdAt: pendingRequest.createdAt,
      isInitiator: pendingRequest.fromUserId?._id?.toString() === userId.toString(),
      isRecipient: pendingRequest.toUserId?._id?.toString() === userId.toString(),
    };
  },

  /**
   * Verify and view transfer request by token.
   */
  async getTransferByToken(token, currentUserId) {
    const request = await OrganizationTransferRequest.findOne({ token })
      .populate('organizationId', 'name slug logoUrl type description membersCount')
      .populate('fromUserId', 'displayName username email avatarUrl')
      .populate('toUserId', 'displayName username email avatarUrl')
      .lean();

    if (!request) {
      throw new NotFoundError('Transfer request not found or invalid token');
    }

    const isExpired = new Date(request.expiresAt) <= new Date();

    return {
      id: request._id.toString(),
      token: request.token,
      status: isExpired && request.status === ORGANIZATION_TRANSFER_STATUS.PENDING ? ORGANIZATION_TRANSFER_STATUS.EXPIRED : request.status,
      expiresAt: request.expiresAt,
      organization: request.organizationId,
      fromUser: request.fromUserId,
      toUser: request.toUserId,
      isRecipient: currentUserId ? request.toUserId?._id?.toString() === currentUserId.toString() : false,
      isInitiator: currentUserId ? request.fromUserId?._id?.toString() === currentUserId.toString() : false,
    };
  },

  /**
   * Accept or Reject ownership transfer by the designated recipient.
   */
  async respondToTransfer({ token, userId, action, ipAddress, userAgent }) {
    const request = await OrganizationTransferRequest.findOne({ token });
    if (!request) {
      throw new NotFoundError('Transfer request not found or invalid token');
    }

    if (request.status !== ORGANIZATION_TRANSFER_STATUS.PENDING) {
      throw new BadRequestError(`This transfer request has already been ${request.status.toLowerCase()}`);
    }

    if (new Date(request.expiresAt) <= new Date()) {
      request.status = ORGANIZATION_TRANSFER_STATUS.EXPIRED;
      await request.save();
      throw new BadRequestError('This ownership transfer invitation has expired');
    }

    // Verify current user is the target recipient
    if (request.toUserId.toString() !== userId.toString()) {
      throw new ForbiddenError(
        'Only the invited recipient can accept or reject this ownership transfer',
        ERROR_CODE.ORGANIZATION_PERMISSION_DENIED
      );
    }

    const org = await Organization.findById(request.organizationId);
    if (!org) {
      throw new NotFoundError('Organization not found', ERROR_CODE.ORGANIZATION_NOT_FOUND);
    }

    const [fromUser, toUser] = await Promise.all([
      User.findById(request.fromUserId),
      User.findById(request.toUserId),
    ]);

    if (action === 'REJECT') {
      request.status = ORGANIZATION_TRANSFER_STATUS.REJECTED;
      request.respondedAt = new Date();
      await request.save();

      // Notify previous owner of rejection
      try {
        await notificationService.createNotification({
          recipient: request.fromUserId,
          actor: userId,
          type: NOTIFICATION_TYPE.ORGANIZATION_TRANSFER_RESULT,
          title: `Transfer Declined: ${org.name}`,
          body: `${toUser?.displayName || toUser?.username || 'The recipient'} declined the ownership transfer for ${org.name}.`,
          entityType: 'organization',
          entityId: org._id.toString(),
          linkUrl: `/app/organizations/${org.slug || org._id}/settings`,
        });
      } catch (err) {
        logger.warn('[OrgTransfer] Notification failed on reject', { error: err.message });
      }

      await recordOrgAudit(org._id, userId, {
        action: 'ORGANIZATION_TRANSFER_DECLINED',
        targetType: 'User',
        targetId: request.fromUserId.toString(),
        details: { requestId: request._id.toString() },
        ipAddress,
        userAgent,
      });

      return {
        success: true,
        status: ORGANIZATION_TRANSFER_STATUS.REJECTED,
        message: `You have declined the ownership transfer for ${org.name}.`,
      };
    }

    if (action === 'ACCEPT') {
      // 1. Update Organization owner
      org.ownerId = request.toUserId;
      await org.save();

      // 2. Demote previous owner to regular MEMBER (as requested: "the last owner will become member of the org")
      const prevOwnerMember = await OrganizationMember.findOne({
        organizationId: org._id,
        userId: request.fromUserId,
      });

      if (prevOwnerMember) {
        prevOwnerMember.role = ORGANIZATION_ROLE.MEMBER;
        prevOwnerMember.permissions = DEFAULT_ROLE_PERMISSIONS.MEMBER;
        await prevOwnerMember.save();
      }

      // 3. Promote target recipient to OWNER
      let targetMember = await OrganizationMember.findOne({
        organizationId: org._id,
        userId: request.toUserId,
      });

      if (targetMember) {
        targetMember.role = ORGANIZATION_ROLE.OWNER;
        targetMember.status = ORGANIZATION_MEMBER_STATUS.ACTIVE;
        targetMember.permissions = DEFAULT_ROLE_PERMISSIONS.OWNER;
        await targetMember.save();
      } else {
        targetMember = await OrganizationMember.create({
          organizationId: org._id,
          userId: request.toUserId,
          role: ORGANIZATION_ROLE.OWNER,
          status: ORGANIZATION_MEMBER_STATUS.ACTIVE,
          permissions: DEFAULT_ROLE_PERMISSIONS.OWNER,
          joinedAt: new Date(),
        });
        org.membersCount = (org.membersCount || 1) + 1;
        await org.save();
      }

      // 4. Mark request accepted
      request.status = ORGANIZATION_TRANSFER_STATUS.ACCEPTED;
      request.respondedAt = new Date();
      await request.save();

      // 5. Notify previous owner
      try {
        await notificationService.createNotification({
          recipient: request.fromUserId,
          actor: userId,
          type: NOTIFICATION_TYPE.ORGANIZATION_TRANSFER_RESULT,
          title: `Ownership Transferred: ${org.name}`,
          body: `${toUser?.displayName || toUser?.username} accepted ownership of ${org.name}. You are now a member of this organization.`,
          entityType: 'organization',
          entityId: org._id.toString(),
          linkUrl: `/c/${org.slug}`,
        });

        if (fromUser?.email) {
          await emailService.sendNotificationEmail({
            to: fromUser.email,
            subject: `Ownership Transferred: ${org.name} on OneWinq`,
            html: `
              <div style="font-family: sans-serif; background: #18181b; color: #f4f4f5; padding: 24px; border-radius: 12px; max-width: 500px; margin: auto;">
                <h2 style="color: #a855f7;">Ownership Successfully Transferred</h2>
                <p>Hello <strong>${fromUser.displayName || fromUser.username}</strong>,</p>
                <p><strong>${toUser?.displayName || toUser?.username}</strong> has accepted the ownership transfer for <strong>${org.name}</strong>.</p>
                <p>You are now registered as a member in this organization.</p>
              </div>
            `,
            text: `${toUser?.displayName || toUser?.username} has accepted ownership of ${org.name}. You are now a member of the organization.`,
          });
        }
      } catch (err) {
        logger.warn('[OrgTransfer] Notification failed on accept', { error: err.message });
      }

      // 6. Notify new owner
      try {
        await notificationService.createNotification({
          recipient: request.toUserId,
          actor: request.fromUserId,
          type: NOTIFICATION_TYPE.ORGANIZATION_TRANSFER_RESULT,
          title: `You are now the Owner of ${org.name}`,
          body: `Ownership transfer completed. You have full administrative control of ${org.name}.`,
          entityType: 'organization',
          entityId: org._id.toString(),
          linkUrl: `/app/organizations/${org.slug || org._id}/settings`,
        });
      } catch (err) {
        logger.warn('[OrgTransfer] Notification to new owner failed', { error: err.message });
      }

      // 7. Audit log
      await recordOrgAudit(org._id, userId, {
        action: 'ORGANIZATION_OWNERSHIP_TRANSFERRED',
        targetType: 'User',
        targetId: request.fromUserId.toString(),
        details: {
          previousOwnerId: request.fromUserId.toString(),
          newOwnerId: request.toUserId.toString(),
          requestId: request._id.toString(),
        },
        ipAddress,
        userAgent,
      });

      return {
        success: true,
        status: ORGANIZATION_TRANSFER_STATUS.ACCEPTED,
        organizationId: org._id.toString(),
        organizationSlug: org.slug,
        organizationName: org.name,
        message: `Congratulations! You are now the official owner of ${org.name}.`,
      };
    }

    throw new BadRequestError('Invalid transfer response action');
  },

  /**
   * Cancel an active transfer request by the owner.
   */
  async cancelTransfer({ organizationId, userId, ipAddress, userAgent }) {
    const org = await Organization.findById(organizationId);
    if (!org) {
      throw new NotFoundError('Organization not found', ERROR_CODE.ORGANIZATION_NOT_FOUND);
    }

    if (org.ownerId.toString() !== userId.toString()) {
      throw new ForbiddenError('Only the organization owner can cancel a pending transfer request');
    }

    const pendingRequest = await OrganizationTransferRequest.findOne({
      organizationId: org._id,
      status: ORGANIZATION_TRANSFER_STATUS.PENDING,
    });

    if (!pendingRequest) {
      throw new NotFoundError('No active pending ownership transfer request found');
    }

    pendingRequest.status = ORGANIZATION_TRANSFER_STATUS.CANCELLED;
    pendingRequest.respondedAt = new Date();
    await pendingRequest.save();

    await recordOrgAudit(org._id, userId, {
      action: 'ORGANIZATION_TRANSFER_CANCELLED',
      targetType: 'User',
      targetId: pendingRequest.toUserId.toString(),
      details: { requestId: pendingRequest._id.toString() },
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      message: 'Ownership transfer request cancelled successfully',
    };
  },
};
