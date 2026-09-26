import { User } from '../users/user.model.js';
import { Profile } from '../profiles/profile.model.js';
import { ProfessionalIdentity } from '../profiles/professionalIdentity.model.js';
import { Connection } from '../connections/connection.model.js';
import { Card } from '../cards/card.model.js';
import { Notification } from '../notifications/notification.model.js';
import { Ticket } from '../support/ticket.model.js';
import { Session } from '../auth/session.model.js';
import { DataExport } from './dataExport.model.js';
import { DeletionRequest } from './deletionRequest.model.js';
import { passwordService } from '../auth/passwordService.js';
import { eventBus } from '../../events/eventBus.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../shared/errors.js';
import {
  DATA_EXPORT_STATUS,
  DELETION_REQUEST_STATUS,
  ACCOUNT_STATE,
  APP_EVENT,
  ERROR_CODE,
  HTTP,
} from '../../config/constants.js';

class PrivacyService {
  /**
   * Compiles and generates a portable GDPR/DPDP JSON data export archive.
   * Enforces 1 request per 24-hour window.
   * @param {string|mongoose.Types.ObjectId} userId
   * @param {object} options
   */
  async requestDataExport(userId, { format = 'JSON' } = {}) {
    // 24-hour rate limit check
    const recentExport = await DataExport.findOne({
      userId,
      createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    if (recentExport) {
      throw new AppError(
        'You can only request one data export every 24 hours. Please wait before generating another.',
        ERROR_CODE.RATE_LIMITED,
        HTTP.TOO_MANY_REQUESTS
      );
    }

    // Collect user data across collections
    const [
      user,
      profiles,
      identities,
      connections,
      cards,
      notifications,
      tickets,
    ] = await Promise.all([
      User.findById(userId),
      Profile.find({ userId }),
      ProfessionalIdentity.find({ userId }),
      Connection.find({ $or: [{ userLow: userId }, { userHigh: userId }] }),
      Card.find({ assignedUser: userId }),
      Notification.find({ recipient: userId }),
      Ticket.find({ userId }),
    ]);

    const dataPayload = {
      exportMetadata: {
        exportedAt: new Date(),
        version: '1.0',
        format,
        regulatoryCompliance: ['GDPR_ARTICLE_20', 'INDIA_DPDP_ACT_2023'],
      },
      account: {
        id: user._id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        accountState: user.accountState,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
      profiles,
      identities,
      connections,
      cards,
      notifications,
      tickets,
    };

    const payloadString = JSON.stringify(dataPayload);
    const fileSizeBytes = Buffer.byteLength(payloadString, 'utf8');

    const dataExport = new DataExport({
      userId,
      format,
      status: DATA_EXPORT_STATUS.READY,
      downloadUrl: `/api/v1/privacy/export/download/${userId}`,
      fileSizeBytes,
      dataPayload,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days TTL
      completedAt: new Date(),
    });

    await dataExport.save();

    eventBus.emit(APP_EVENT.DATA_EXPORT_COMPLETED, {
      userId,
      exportId: dataExport._id,
      fileSizeBytes,
    });

    logger.info('Privacy data export completed', {
      userId,
      exportId: dataExport._id,
      fileSizeBytes,
    });

    return dataExport;
  }

  /**
   * Retrieves the most recent active data export for the user.
   * @param {string|mongoose.Types.ObjectId} userId
   */
  async getLatestExport(userId) {
    const latest = await DataExport.findOne({
      userId,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    return latest || null;
  }

  /**
   * Initiates the 30-day cooling-off account deletion pipeline.
   * Requires password re-authentication.
   * @param {string|mongoose.Types.ObjectId} userId
   * @param {object} input
   */
  async scheduleAccountDeletion(userId, { password, reason = '' }) {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) {
      throw new AppError('User not found', ERROR_CODE.NOT_FOUND, HTTP.NOT_FOUND);
    }

    // Verify password for security
    const isValid = await passwordService.verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new AppError(
        'Invalid password. Deletion authorization failed.',
        ERROR_CODE.INVALID_CREDENTIALS,
        HTTP.UNAUTHORIZED
      );
    }

    const scheduledDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30-day cooling off

    user.accountState = ACCOUNT_STATE.DELETION_PENDING;
    user.deletionRequestedAt = new Date();
    user.deletionScheduledFor = scheduledDate;
    await user.save();

    // Revoke all active sessions
    await Session.updateMany({ userId }, { isRevoked: true });

    let request = await DeletionRequest.findOne({
      userId,
      status: DELETION_REQUEST_STATUS.PENDING,
    });

    if (!request) {
      request = new DeletionRequest({
        userId,
        status: DELETION_REQUEST_STATUS.PENDING,
        reason,
        scheduledFor: scheduledDate,
      });
      await request.save();
    }

    eventBus.emit(APP_EVENT.ACCOUNT_DELETION_SCHEDULED, {
      userId,
      scheduledFor: scheduledDate,
    });

    logger.info('Account deletion scheduled (30-day cooling off)', {
      userId,
      scheduledFor: scheduledDate,
    });

    return request;
  }

  /**
   * Cancels a pending account deletion and restores the account to ACTIVE.
   * @param {string|mongoose.Types.ObjectId} userId
   */
  async restoreAccount(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', ERROR_CODE.NOT_FOUND, HTTP.NOT_FOUND);
    }

    if (user.accountState !== ACCOUNT_STATE.DELETION_PENDING) {
      throw new AppError(
        'Account is not currently scheduled for deletion.',
        ERROR_CODE.VALIDATION_ERROR,
        HTTP.BAD_REQUEST
      );
    }

    user.accountState = ACCOUNT_STATE.ACTIVE;
    user.deletionRequestedAt = null;
    user.deletionScheduledFor = null;
    await user.save();

    await DeletionRequest.updateMany(
      { userId, status: DELETION_REQUEST_STATUS.PENDING },
      { status: DELETION_REQUEST_STATUS.CANCELLED, cancelledAt: new Date() }
    );

    eventBus.emit(APP_EVENT.ACCOUNT_DELETION_CANCELLED, { userId });

    logger.info('Account deletion cancelled; account restored to active', { userId });

    return user;
  }

  /**
   * Temporarily deactivates an account. Profile becomes hidden from discovery and public view.
   */
  async deactivateAccount(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', ERROR_CODE.NOT_FOUND, HTTP.NOT_FOUND);
    }
    if (user.accountState === ACCOUNT_STATE.SUSPENDED) {
      throw new AppError('Suspended account cannot be modified', ERROR_CODE.FORBIDDEN, HTTP.FORBIDDEN);
    }
    user.accountState = ACCOUNT_STATE.DEACTIVATED;
    await user.save();

    // Revoke sessions
    await Session.deleteMany({ userId });
    return user;
  }

  /**
   * Reactivates a deactivated account back to ACTIVE.
   */
  async reactivateAccount(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', ERROR_CODE.NOT_FOUND, HTTP.NOT_FOUND);
    }
    if (user.accountState !== ACCOUNT_STATE.DEACTIVATED) {
      throw new AppError('Account is not deactivated', ERROR_CODE.VALIDATION_ERROR, HTTP.BAD_REQUEST);
    }
    user.accountState = ACCOUNT_STATE.ACTIVE;
    await user.save();
    return user;
  }
}

export const privacyService = new PrivacyService();
