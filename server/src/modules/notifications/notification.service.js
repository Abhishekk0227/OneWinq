import { Notification } from './notification.model.js';
import { NotificationPreference } from './notificationPreference.model.js';
import { socketEmitter } from '../../infrastructure/sockets/socketEmitter.js';
import { emailService } from '../../infrastructure/email/emailService.js';
import { User } from '../users/user.model.js';
import { NOTIFICATION_TYPE } from '../../config/constants.js';
import { NotFoundError } from '../../shared/errors.js';
import logger from '../../utils/logger.js';

function mapTypeToPrefKey(type) {
  switch (type) {
    case NOTIFICATION_TYPE.CONNECTION_REQUEST:
    case NOTIFICATION_TYPE.CONNECTION_ACCEPTED:
      return 'connectionRequests';
    case NOTIFICATION_TYPE.NEW_MESSAGE:
      return 'messages';
    case NOTIFICATION_TYPE.PROFILE_VIEW:
      return 'profileViews';
    case NOTIFICATION_TYPE.POST_LIKE:
    case NOTIFICATION_TYPE.POST_COMMENT:
      return 'social';
    case NOTIFICATION_TYPE.ORDER_UPDATE:
    case NOTIFICATION_TYPE.CARD_ACTIVATED:
    case NOTIFICATION_TYPE.SUBSCRIPTION_UPDATE:
      return 'transactions';
    case NOTIFICATION_TYPE.REPORT_RESPONSE:
    case NOTIFICATION_TYPE.TICKET_RESPONSE:
      return 'support';
    case NOTIFICATION_TYPE.SECURITY_ALERT:
    case NOTIFICATION_TYPE.CARD_TRANSFER_REQUEST:
    case NOTIFICATION_TYPE.CARD_TRANSFER_RESULT:
      return 'security';
    case NOTIFICATION_TYPE.SYSTEM_ANNOUNCEMENT:
    default:
      return 'system';
  }
}

function resolveNotificationLink(n) {
  if (n.linkUrl) return n.linkUrl;
  if (n.metadata?.linkUrl) return n.metadata.linkUrl;
  const username = n.actor?.username || n.metadata?.username;
  switch (n.type) {
    case 'CONNECTION_REQUEST':
      return '/app/connections';
    case 'CONNECTION_ACCEPTED':
      return username ? `/u/${username}` : '/app/connections';
    case 'NEW_MESSAGE':
      return n.entityId ? `/app/messages?cid=${n.entityId}` : '/app/messages';
    case 'PROFILE_VIEW':
      return username ? `/u/${username}` : '/app/analytics';
    case 'CARD_ACTIVATED':
      return '/app/cards';
    case 'ORDER_UPDATE':
    case 'ORDER_STATUS_CHANGED':
      return '/app/orders';
    case 'REPORT_RESPONSE':
      return '/app/settings';
    case 'TICKET_RESPONSE':
      return '/app/support';
    case 'POST_LIKE':
    case 'POST_COMMENT':
      return n.entityId ? `/app?postId=${n.entityId}` : '/app';
    case 'SECURITY_ALERT':
      return '/app/settings';
    case 'ORGANIZATION_INVITATION':
      return n.linkUrl || (n.metadata?.token ? `/invitation?token=${n.metadata.token}` : '/app');
    default:
      if (n.entityType === 'organization') {
        return n.linkUrl || (n.metadata?.token ? `/invitation?token=${n.metadata.token}` : '/app');
      }
      if (n.entityType === 'connection') return '/app/connections';
      if (n.entityType === 'conversation') return n.entityId ? `/app/messages?cid=${n.entityId}` : '/app/messages';
      if (n.entityType === 'profile') return username ? `/u/${username}` : '/app/profile';
      if (n.entityType === 'card') return '/app/cards';
      if (n.entityType === 'order') return '/app/orders';
      if (n.entityType === 'post') return n.entityId ? `/app?postId=${n.entityId}` : '/app';
      if (n.entityType === 'ticket') return '/app/support';
      if (n.entityType === 'report') return '/app/settings';
      return null;
  }
}

export const notificationService = {
  /**
   * Get user notification preferences, creating defaults if not yet present.
   */
  async getPreferences(userId) {
    let prefs = await NotificationPreference.findOne({ user: userId }).lean();
    if (!prefs) {
      prefs = await NotificationPreference.create({ user: userId });
      prefs = prefs.toObject();
    }
    return prefs;
  },

  /**
   * Update notification preferences for a user.
   */
  async updatePreferences(userId, patch) {
    const existing = await this.getPreferences(userId);

    const update = {
      inApp: {
        ...existing.inApp,
        ...(patch.inApp || {}),
      },
      email: {
        ...existing.email,
        ...(patch.email || {}),
        security: true, // Always required for security alerts
      },
    };

    const updated = await NotificationPreference.findOneAndUpdate(
      { user: userId },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();

    return updated;
  },

  /**
   * Create and deliver a notification respecting recipient preferences.
   */
  async createNotification({
    recipientId,
    actorId = null,
    type,
    title,
    body,
    entityType = 'system',
    entityId = null,
    linkUrl = null,
    metadata = {},
  }) {
    try {
      const prefs = await this.getPreferences(recipientId);
      const prefKey = mapTypeToPrefKey(type);

      let savedNotification = null;

      // 1. Check inApp preference
      const inAppAllowed =
        prefKey === 'security' || prefs.inApp?.[prefKey] !== false;

      const finalLink = linkUrl || resolveNotificationLink({ type, entityType, entityId, metadata });

      if (inAppAllowed) {
        savedNotification = await Notification.create({
          recipient: recipientId,
          actor: actorId,
          type,
          title,
          body,
          entityType,
          entityId,
          linkUrl: finalLink,
          metadata: {
            ...metadata,
            linkUrl: finalLink,
          },
        });

        const formatted = {
          id: savedNotification._id.toString(),
          recipient: recipientId.toString(),
          actor: actorId ? actorId.toString() : null,
          type: savedNotification.type,
          title: savedNotification.title,
          body: savedNotification.body,
          entityType: savedNotification.entityType,
          entityId: savedNotification.entityId,
          linkUrl: savedNotification.linkUrl,
          link: savedNotification.linkUrl,
          metadata: savedNotification.metadata,
          isRead: savedNotification.isRead,
          createdAt: savedNotification.createdAt,
        };

        // Real-time delivery via Socket.IO
        socketEmitter.emitToUser(recipientId.toString(), 'notification_new', formatted);
      }

      // 2. Check email preference (async, fire & forget)
      const emailAllowed =
        prefKey === 'security' || prefs.email?.[prefKey] === true;

      if (emailAllowed) {
        this.sendEmailNotification({
          recipientId,
          type,
          title,
          body,
        }).catch((err) => {
          logger.warn('Failed to send notification email', {
            recipientId,
            type,
            error: err.message,
          });
        });
      }

      return savedNotification;
    } catch (err) {
      logger.error('Error in createNotification', {
        recipientId,
        type,
        error: err.message,
      });
      return null;
    }
  },

  /**
   * Send transactional email for notification.
   */
  async sendEmailNotification({ recipientId, _type, title, body }) {
    const user = await User.findById(recipientId).select('email displayName').lean();
    if (!user || !user.email) {
      return;
    }

    await emailService.sendNotificationEmail({
      to: user.email,
      subject: `[OneWinq] ${title}`,
      text: `${body}\n\nManage your notification preferences in OneWinq settings.`,
      html: `<p>${body}</p><p><small>Manage your notification preferences in OneWinq settings.</small></p>`,
    });
  },

  /**
   * List notifications for a user with cursor pagination.
   */
  async listNotifications(userId, { cursor, limit = 20, isRead } = {}) {
    const filter = { recipient: userId };

    if (cursor) {
      filter._id = { $lt: cursor };
    }

    if (typeof isRead === 'boolean') {
      filter.isRead = isRead;
    }

    const items = await Notification.find(filter)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .populate('actor', 'username displayName avatarUrl')
      .lean();

    const hasMore = items.length > limit;
    const notifications = hasMore ? items.slice(0, limit) : items;
    const nextCursor =
      hasMore && notifications.length > 0
        ? notifications[notifications.length - 1]._id.toString()
        : null;

    return {
      notifications: notifications.map((n) => {
        const resolvedLink = n.linkUrl || resolveNotificationLink(n);
        return {
          id: n._id.toString(),
          type: n.type,
          title: n.title,
          body: n.body,
          message: n.body,
          link: resolvedLink,
          linkUrl: resolvedLink,
          entityType: n.entityType,
          entityId: n.entityId,
          metadata: n.metadata,
          isRead: n.isRead,
          readAt: n.readAt,
          actor: n.actor
            ? {
                id: n.actor._id.toString(),
                username: n.actor.username,
                displayName: n.actor.displayName,
                avatarUrl: n.actor.avatarUrl || null,
              }
            : null,
          createdAt: n.createdAt,
        };
      }),
      nextCursor,
      hasMore,
    };
  },

  /**
   * Get unread notification count.
   */
  async getUnreadCount(userId) {
    const count = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });
    return count;
  },

  /**
   * Mark a single notification as read.
   */
  async markAsRead(userId, notificationId) {
    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId,
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    return {
      id: notification._id.toString(),
      isRead: notification.isRead,
      readAt: notification.readAt,
    };
  },

  /**
   * Mark all notifications as read for a user.
   */
  async markAllAsRead(userId) {
    const result = await Notification.updateMany(
      { recipient: userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } },
    );

    return {
      modifiedCount: result.modifiedCount || 0,
    };
  },
};
