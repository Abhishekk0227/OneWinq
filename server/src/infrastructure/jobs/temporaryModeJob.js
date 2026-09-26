import mongoose from 'mongoose';
import { Profile } from '../../modules/profiles/profile.model.js';
import logger from '../../utils/logger.js';

/**
 * Normalizes expired temporary modes on user profiles.
 * Business rules work on-the-fly via publicResolver, but this job
 * keeps database state clean and normalized.
 */
export async function runTemporaryModeNormalization() {
  if (mongoose.connection.readyState !== 1) {
    return { modifiedCount: 0 };
  }

  const now = new Date();
  try {
    const result = await Profile.updateMany(
      {
        temporaryModeExpiresAt: { $ne: null, $lte: now },
      },
      [
        {
          $set: {
            activeMode: { $ifNull: ['$temporaryModeFallback', 'PUBLIC'] },
            temporaryMode: null,
            temporaryModeExpiresAt: null,
            temporaryModeFallback: null,
          },
        },
      ],
    );

    if (result.modifiedCount > 0) {
      logger.info(`[Job:TemporaryMode] Normalized ${result.modifiedCount} expired profile modes`);
    }

    return { modifiedCount: result.modifiedCount };
  } catch (err) {
    logger.error('[Job:TemporaryMode] Failed to normalize temporary modes', { error: err.message });
    throw err;
  }
}
