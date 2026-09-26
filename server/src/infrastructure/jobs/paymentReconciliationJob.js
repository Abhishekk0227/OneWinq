import mongoose from 'mongoose';
import { Subscription } from '../../modules/subscriptions/subscription.model.js';
import logger from '../../utils/logger.js';

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Reconciles overdue or expired subscriptions outside the grace period.
 */
export async function runPaymentReconciliation() {
  if (mongoose.connection.readyState !== 1) {
    return { reconciledCount: 0 };
  }

  const graceCutoff = new Date(Date.now() - THREE_DAYS_MS);
  try {
    const result = await Subscription.updateMany(
      {
        status: { $in: ['ACTIVE', 'PAST_DUE'] },
        currentPeriodEnd: { $lt: graceCutoff },
        cancelAtPeriodEnd: true,
      },
      {
        $set: { status: 'EXPIRED' },
      },
    );

    if (result.modifiedCount > 0) {
      logger.info(`[Job:PaymentReconciliation] Reconciled ${result.modifiedCount} expired subscriptions`);
    }

    return { reconciledCount: result.modifiedCount };
  } catch (err) {
    logger.error('[Job:PaymentReconciliation] Error reconciling payments', { error: err.message });
    throw err;
  }
}
