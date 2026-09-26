import { notificationService } from './notification.service.js';
import {
  listNotificationsSchema,
  updatePreferencesSchema,
  validate,
} from './notification.validation.js';
import { successResponse } from '../../shared/response.js';

export const notificationController = {
  /**
   * GET /api/v1/notifications
   */
  async listNotifications(req, res, next) {
    try {
      const validated = validate(listNotificationsSchema, req.query);
      const result = await notificationService.listNotifications(req.user.id, validated);
      return res.status(200).json(
        successResponse(result, 'Notifications fetched successfully.', {
          cursor: result.nextCursor,
          hasMore: result.hasMore,
        }),
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/v1/notifications/unread-count
   */
  async getUnreadCount(req, res, next) {
    try {
      const count = await notificationService.getUnreadCount(req.user.id);
      return res.status(200).json(
        successResponse({ unreadCount: count, count }, 'Unread count fetched successfully.'),
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * PATCH /api/v1/notifications/:id/read
   */
  async markAsRead(req, res, next) {
    try {
      const result = await notificationService.markAsRead(req.user.id, req.params.id);
      return res.status(200).json(
        successResponse(result, 'Notification marked as read.'),
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * POST /api/v1/notifications/read-all
   */
  async markAllAsRead(req, res, next) {
    try {
      const result = await notificationService.markAllAsRead(req.user.id);
      return res.status(200).json(
        successResponse(result, 'All notifications marked as read.'),
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/v1/notifications/preferences
   */
  async getPreferences(req, res, next) {
    try {
      const prefs = await notificationService.getPreferences(req.user.id);
      return res.status(200).json(
        successResponse({ preferences: prefs }, 'Preferences fetched successfully.'),
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * PATCH /api/v1/notifications/preferences
   */
  async updatePreferences(req, res, next) {
    try {
      const validated = validate(updatePreferencesSchema, req.body);
      const updated = await notificationService.updatePreferences(req.user.id, validated);
      return res.status(200).json(
        successResponse({ preferences: updated }, 'Preferences updated successfully.'),
      );
    } catch (err) {
      return next(err);
    }
  },
};
