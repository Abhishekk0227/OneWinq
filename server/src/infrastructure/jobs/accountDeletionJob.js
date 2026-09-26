import mongoose from 'mongoose';
import { DeletionRequest } from '../../modules/privacy/deletionRequest.model.js';
import { User } from '../../modules/users/user.model.js';
import { Session } from '../../modules/auth/session.model.js';
import { ACCOUNT_STATE } from '../../config/constants.js';
import logger from '../../utils/logger.js';

/**
 * Processes pending deletion requests whose 30-day cooling-off period has expired.
 * Permanently deletes/anonymizes user data.
 */
export async function runAccountDeletionProcessing() {
  if (mongoose.connection.readyState !== 1) {
    return { processedCount: 0 };
  }

  const now = new Date();
  try {
    const expiredRequests = await DeletionRequest.find({
      status: 'PENDING',
      scheduledDeletionDate: { $lte: now },
    }).limit(50);

    let processedCount = 0;
    for (const req of expiredRequests) {
      try {
        const user = await User.findById(req.userId);
        if (user) {
          // Anonymize user credentials & personal identity
          user.accountState = ACCOUNT_STATE.PERMANENTLY_DELETED;
          user.displayName = 'Deleted User';
          user.email = `deleted_${user._id}@deleted.onewinq.local`;
          user.passwordHash = 'DELETED';
          user.appearInDiscovery = false;
          await user.save();

          // Invalidate all sessions
          await Session.updateMany({ userId: user._id }, { isActive: false });
        }

        req.status = 'EXECUTED';
        req.executedAt = new Date();
        await req.save();
        processedCount++;
      } catch (err) {
        logger.error(`[Job:AccountDeletion] Error processing deletion for user ${req.userId}`, {
          error: err.message,
        });
      }
    }

    if (processedCount > 0) {
      logger.info(`[Job:AccountDeletion] Executed permanent deletion for ${processedCount} accounts`);
    }

    return { processedCount };
  } catch (err) {
    logger.error('[Job:AccountDeletion] Failed to process account deletions', { error: err.message });
    throw err;
  }
}
