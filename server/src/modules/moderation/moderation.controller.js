import { moderationService } from './moderation.service.js';
import { createReportSchema } from './moderation.validation.js';
import { sendSuccess } from '../../shared/response.js';
import { HTTP } from '../../config/constants.js';

export class ModerationController {
  /**
   * POST /api/v1/reports
   * Submits an abuse report against a profile, message, or card.
   */
  async submitReport(req, res, next) {
    try {
      const parsed = createReportSchema.parse(req.body);
      const report = await moderationService.createReport(req.user.id, parsed);
      return sendSuccess(
        res,
        HTTP.CREATED,
        'Report submitted successfully. Our safety team will review it.',
        { report }
      );
    } catch (err) {
      return next(err);
    }
  }

  /**
   * GET /api/v1/reports/me
   * Retrieves reports submitted by the authenticated user.
   */
  async getMyReports(req, res, next) {
    try {
      const data = await moderationService.getMyReports(req.user.id, req.query);
      return sendSuccess(res, HTTP.OK, 'Reports retrieved successfully', data);
    } catch (err) {
      return next(err);
    }
  }
}

export const moderationController = new ModerationController();
