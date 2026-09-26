import mongoose from 'mongoose';
import { Notification } from '../../modules/notifications/notification.model.js';
import logger from '../../utils/logger.js';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Purges notifications older than 30 days.
 */
export async function runNotificationCleanup() {
  if (mongoose.connection.readyState !== 1) {
    return { deletedCount: 0 };
  }

  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS);
  try {
    const result = await Notification.deleteMany({
      createdAt: { $lt: cutoff },
    });

    if (result.deletedCount > 0) {
      logger.info(`[Job:NotificationCleanup] Purged ${result.deletedCount} notifications older than 30 days`);
    }

    return { deletedCount: result.deletedCount };
  } catch (err) {
    logger.error('[Job:NotificationCleanup] Failed to purge old notifications', { error: err.message });
    throw err;
  }
}
