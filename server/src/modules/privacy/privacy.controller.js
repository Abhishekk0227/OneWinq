import { privacyService } from './privacy.service.js';
import { requestExportSchema, deleteAccountSchema } from './privacy.validation.js';
import { sendSuccess } from '../../shared/response.js';
import { HTTP, ERROR_CODE } from '../../config/constants.js';
import { AppError } from '../../shared/errors.js';

export class PrivacyController {
  /**
   * POST /api/v1/privacy/export
   * Requests a full machine-readable JSON data archive.
   */
  async requestExport(req, res, next) {
    try {
      const parsed = requestExportSchema.parse(req.body || {});
      const exportDoc = await privacyService.requestDataExport(req.user.id, parsed);
      return sendSuccess(res, HTTP.CREATED, 'Data export generated successfully', {
        export: {
          id: exportDoc._id,
          status: exportDoc.status,
          downloadUrl: exportDoc.downloadUrl,
          fileSizeBytes: exportDoc.fileSizeBytes,
          expiresAt: exportDoc.expiresAt,
        },
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * GET /api/v1/privacy/export/latest
   * Checks status and download URL for latest active data export.
   */
  async getLatestExport(req, res, next) {
    try {
      const exportDoc = await privacyService.getLatestExport(req.user.id);
      return sendSuccess(res, HTTP.OK, 'Latest data export retrieved', {
        export: exportDoc
          ? {
              id: exportDoc._id,
              status: exportDoc.status,
              downloadUrl: exportDoc.downloadUrl,
              fileSizeBytes: exportDoc.fileSizeBytes,
              expiresAt: exportDoc.expiresAt,
            }
          : null,
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * GET /api/v1/privacy/export/download/:userId
   * Downloads the raw JSON export data archive.
   */
  async downloadExport(req, res, next) {
    try {
      if (req.user.id !== req.params.userId) {
        throw new AppError('Access denied', ERROR_CODE.FORBIDDEN, HTTP.FORBIDDEN);
      }

      const exportDoc = await privacyService.getLatestExport(req.user.id);
      if (!exportDoc || !exportDoc.dataPayload) {
        throw new AppError(
          'Export data not found or expired',
          ERROR_CODE.NOT_FOUND,
          HTTP.NOT_FOUND
        );
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="onewinq-data-export-${req.user.id}.json"`
      );
      return res.status(200).send(JSON.stringify(exportDoc.dataPayload, null, 2));
    } catch (err) {
      return next(err);
    }
  }

  /**
   * POST /api/v1/privacy/delete-account
   * Initiates 30-day cooling-off account deletion.
   */
  async deleteAccount(req, res, next) {
    try {
      const parsed = deleteAccountSchema.parse(req.body);
      const request = await privacyService.scheduleAccountDeletion(req.user.id, parsed);
      return sendSuccess(
        res,
        HTTP.OK,
        'Account scheduled for deletion. You have a 30-day cooling-off period to restore your account.',
        {
          deletionRequest: {
            scheduledFor: request.scheduledFor,
            coolingOffDays: 30,
          },
        }
      );
    } catch (err) {
      return next(err);
    }
  }

  /**
   * POST /api/v1/privacy/restore-account
   * Restores an account scheduled for deletion.
   */
  async restoreAccount(req, res, next) {
    try {
      const user = await privacyService.restoreAccount(req.user.id);
      return sendSuccess(res, HTTP.OK, 'Account restored successfully.', {
        user: {
          id: user._id,
          accountState: user.accountState,
        },
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * POST /api/v1/privacy/deactivate
   * Temporarily deactivates the user account.
   */
  async deactivateAccount(req, res, next) {
    try {
      const user = await privacyService.deactivateAccount(req.user.id);
      return sendSuccess(res, HTTP.OK, 'Account deactivated successfully.', {
        user: {
          id: user._id,
          accountState: user.accountState,
        },
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * POST /api/v1/privacy/reactivate
   * Reactivates a deactivated account.
   */
  async reactivateAccount(req, res, next) {
    try {
      const user = await privacyService.reactivateAccount(req.user.id);
      return sendSuccess(res, HTTP.OK, 'Account reactivated successfully.', {
        user: {
          id: user._id,
          accountState: user.accountState,
        },
      });
    } catch (err) {
      return next(err);
    }
  }
}

export const privacyController = new PrivacyController();
