import mongoose from 'mongoose';
import { RawEvent } from '../../modules/analytics/rawEvent.model.js';
import logger from '../../utils/logger.js';

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Purges raw telemetry events older than 1 year (365 days).
 * Aggregated metrics in ProfileAnalytics and CardAnalytics remain.
 */
export async function runAnalyticsRetention() {
  if (mongoose.connection.readyState !== 1) {
    return { deletedCount: 0 };
  }

  const cutoff = new Date(Date.now() - ONE_YEAR_MS);
  try {
    const result = await RawEvent.deleteMany({
      timestamp: { $lt: cutoff },
    });

    if (result.deletedCount > 0) {
      logger.info(`[Job:AnalyticsRetention] Purged ${result.deletedCount} raw events older than 1 year`);
    }

    return { deletedCount: result.deletedCount };
  } catch (err) {
    logger.error('[Job:AnalyticsRetention] Failed to clean up raw analytics', { error: err.message });
    throw err;
  }
}
