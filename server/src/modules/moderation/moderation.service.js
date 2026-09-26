import { Report } from './report.model.js';
import { eventBus } from '../../events/eventBus.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../shared/errors.js';
import {
  REPORT_STATE,
  APP_EVENT,
  ERROR_CODE,
  HTTP,
} from '../../config/constants.js';

class ModerationService {
  /**
   * Submits a new abuse report against a profile, message, or card.
   * @param {string|mongoose.Types.ObjectId} reporterId
   * @param {object} data
   */
  async createReport(reporterId, data) {
    // Prevent duplicate pending reports against the same target by the same reporter
    const existing = await Report.findOne({
      reporter: reporterId,
      targetType: data.targetType,
      targetId: data.targetId,
      status: { $in: [REPORT_STATE.OPEN, REPORT_STATE.UNDER_REVIEW] },
    });

    if (existing) {
      throw new AppError(
        'You have already submitted an active report for this entity. Our moderation team is reviewing it.',
        ERROR_CODE.CONFLICT,
        HTTP.CONFLICT
      );
    }

    const report = new Report({
      reporter: reporterId,
      reportedUser: data.reportedUser || null,
      targetType: data.targetType,
      targetId: data.targetId,
      reason: data.reason,
      description: data.description || '',
      evidenceMedia: data.evidenceMedia || [],
      status: REPORT_STATE.OPEN,
    });

    await report.save();

    eventBus.emit(APP_EVENT.REPORT_CREATED, {
      reportId: report._id,
      reporterId,
      targetType: data.targetType,
      targetId: data.targetId,
      reason: data.reason,
    });

    logger.info('Abuse report submitted', {
      reportId: report._id,
      reporterId,
      targetType: data.targetType,
      reason: data.reason,
    });

    return report;
  }

  /**
   * Retrieves reports submitted by a specific user.
   * @param {string|mongoose.Types.ObjectId} reporterId
   * @param {object} options
   */
  async getMyReports(reporterId, { limit = 20, cursor = null } = {}) {
    const query = { reporter: reporterId };
    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    const pageSize = Math.min(Number(limit) || 20, 50);
    const reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .limit(pageSize + 1);

    const hasMore = reports.length > pageSize;
    const results = hasMore ? reports.slice(0, pageSize) : reports;
    const nextCursor = hasMore ? results[results.length - 1].createdAt.toISOString() : null;

    return {
      reports: results,
      pagination: {
        hasMore,
        nextCursor,
      },
    };
  }

  /**
   * Resolves or dismisses a report (Admin/Moderator capability).
   * @param {string|mongoose.Types.ObjectId} adminId
   * @param {string|mongoose.Types.ObjectId} reportId
   * @param {object} resolution
   */
  async resolveReport(adminId, reportId, { status, actionTaken = 'NONE', resolutionNotes = '' }) {
    const report = await Report.findById(reportId);
    if (!report) {
      throw new AppError('Report not found', ERROR_CODE.NOT_FOUND, HTTP.NOT_FOUND);
    }

    report.status = status;
    report.actionTaken = actionTaken;
    report.resolutionNotes = resolutionNotes;
    report.resolvedBy = adminId;
    report.resolvedAt = new Date();
    await report.save();

    eventBus.emit(APP_EVENT.REPORT_RESOLVED, {
      reportId: report._id,
      adminId,
      status,
      actionTaken,
    });

    logger.info('Report resolved by moderator', {
      reportId: report._id,
      adminId,
      status,
      actionTaken,
    });

    return report;
  }
}

export const moderationService = new ModerationService();
