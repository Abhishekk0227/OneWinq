import { analyticsService } from './analytics.service.js';
import {
  timeRangeQuerySchema,
  trackLinkClickSchema,
  validate,
} from './analytics.validation.js';
import { successResponse } from '../../shared/response.js';

export const analyticsController = {
  /**
   * GET /api/v1/analytics/overview
   */
  async getOverview(req, res, next) {
    try {
      const validated = validate(timeRangeQuerySchema, req.query);
      const data = await analyticsService.getOverview(req.user.id, validated);
      return res.status(200).json(
        successResponse(data, 'Analytics overview retrieved successfully.'),
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/v1/analytics/profile
   */
  async getProfileAnalytics(req, res, next) {
    try {
      const validated = validate(timeRangeQuerySchema, req.query);
      const data = await analyticsService.getProfileAnalytics(req.user.id, validated);
      return res.status(200).json(
        successResponse(data, 'Profile analytics retrieved successfully.'),
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/v1/analytics/cards/:cardUid
   */
  async getCardAnalytics(req, res, next) {
    try {
      const validated = validate(timeRangeQuerySchema, req.query);
      const data = await analyticsService.getCardAnalytics(
        req.user.id,
        req.params.cardUid,
        validated,
      );
      return res.status(200).json(
        successResponse(data, 'Card analytics retrieved successfully.'),
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * POST /api/v1/analytics/events/link-click
   */
  async trackLinkClick(req, res, next) {
    try {
      const validated = validate(trackLinkClickSchema, req.body);
      await analyticsService.recordEvent({
        eventType: 'link.clicked',
        targetUserId: validated.targetUserId,
        actorUserId: req.user?.id || null,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: {
          linkUrl: validated.linkUrl,
          label: validated.label,
        },
      });

      return res.status(200).json(
        successResponse({ tracked: true }, 'Link click tracked successfully.'),
      );
    } catch (err) {
      return next(err);
    }
  },
};
