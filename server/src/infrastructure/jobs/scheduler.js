import logger from '../../utils/logger.js';
import { runTemporaryModeNormalization } from './temporaryModeJob.js';
import { runNotificationCleanup } from './notificationCleanupJob.js';
import { runAnalyticsRetention } from './analyticsRetentionJob.js';
import { runMediaOrphanCleanup } from './mediaOrphanCleanupJob.js';
import { runAccountDeletionProcessing } from './accountDeletionJob.js';
import { runPaymentReconciliation } from './paymentReconciliationJob.js';

let schedulerTimer = null;

/**
 * Execute all background maintenance jobs once.
 */
export async function runAllJobs() {
  logger.info('[Scheduler] Running all background maintenance jobs...');
  try {
    await runTemporaryModeNormalization();
    await runNotificationCleanup();
    await runAnalyticsRetention();
    await runMediaOrphanCleanup();
    await runAccountDeletionProcessing();
    await runPaymentReconciliation();
    logger.info('[Scheduler] Completed background maintenance cycle.');
  } catch (err) {
    logger.error('[Scheduler] Error during job execution cycle', { error: err.message });
  }
}

/**
 * Start the background jobs scheduler loop.
 * Runs hourly by default, or with custom interval.
 */
export function startScheduler(intervalMs = 60 * 60 * 1000) {
  if (schedulerTimer) {
    return;
  }
  logger.info(`[Scheduler] Started background jobs scheduler (interval: ${intervalMs}ms)`);
  schedulerTimer = setInterval(runAllJobs, intervalMs);
}

/**
 * Stop the background scheduler.
 */
export function stopScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    logger.info('[Scheduler] Stopped background jobs scheduler');
  }
}
