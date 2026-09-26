import mongoose from 'mongoose';
import { Media } from '../../modules/media/media.model.js';
import { storageService } from '../storage/storageService.js';
import logger from '../../utils/logger.js';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * Purges media uploads that were abandoned in PENDING_UPLOAD or marked DELETED
 * for more than 24 hours.
 */
export async function runMediaOrphanCleanup() {
  if (mongoose.connection.readyState !== 1) {
    return { cleanedCount: 0 };
  }

  const cutoff = new Date(Date.now() - TWENTY_FOUR_HOURS_MS);
  try {
    const orphans = await Media.find({
      state: { $in: ['PENDING_UPLOAD', 'DELETED'] },
      updatedAt: { $lt: cutoff },
    }).limit(100);

    let cleanedCount = 0;
    for (const media of orphans) {
      try {
        if (media.storageKey) {
          await storageService.deleteObject(media.storageKey);
        }
        await Media.deleteOne({ _id: media._id });
        cleanedCount++;
      } catch (err) {
        logger.warn(`[Job:MediaOrphan] Could not delete media ${media._id}`, { error: err.message });
      }
    }

    if (cleanedCount > 0) {
      logger.info(`[Job:MediaOrphan] Cleaned up ${cleanedCount} orphaned media files`);
    }

    return { cleanedCount };
  } catch (err) {
    logger.error('[Job:MediaOrphan] Failed to clean up media orphans', { error: err.message });
    throw err;
  }
}
