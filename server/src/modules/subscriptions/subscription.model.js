import mongoose from 'mongoose';
import {
  PLAN_TIER,
  SUBSCRIPTION_STATUS,
  BILLING_CYCLE,
  SUBSCRIPTION_GATEWAY,
} from '../../config/constants.js';

const GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000; // 3 days grace for PAST_DUE

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    planCode: {
      type: String,
      required: true,
      enum: Object.values(PLAN_TIER),
      default: PLAN_TIER.FREE,
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(SUBSCRIPTION_STATUS),
      default: SUBSCRIPTION_STATUS.ACTIVE,
      index: true,
    },
    billingCycle: {
      type: String,
      enum: Object.values(BILLING_CYCLE),
      default: BILLING_CYCLE.MONTHLY,
    },
    gateway: {
      type: String,
      enum: Object.values(SUBSCRIPTION_GATEWAY),
      default: SUBSCRIPTION_GATEWAY.SYSTEM,
    },
    gatewaySubscriptionId: {
      type: String,
      sparse: true,
      index: true,
    },
    gatewayCustomerId: {
      type: String,
      default: null,
    },
    gatewayPaymentId: {
      type: String,
      default: null,
    },
    currentPeriodStart: {
      type: Date,
      default: Date.now,
    },
    currentPeriodEnd: {
      type: Date,
      default: null,
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
    canceledAt: {
      type: Date,
      default: null,
    },
    trialEnd: {
      type: Date,
      default: null,
    },
    paymentFailedAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

subscriptionSchema.index({ userId: 1, status: 1 });

/**
 * Checks if this subscription grants active entitlement access.
 * Returns true if ACTIVE or TRIALING.
 * If PAST_DUE, returns true if within 3-day grace period.
 */
subscriptionSchema.methods.hasEntitlementAccess = function () {
  const now = new Date();

  if (this.status === SUBSCRIPTION_STATUS.ACTIVE || this.status === SUBSCRIPTION_STATUS.TRIALING) {
    if (this.currentPeriodEnd && this.currentPeriodEnd < now && !this.cancelAtPeriodEnd) {
      // Period has ended but not updated yet
      return false;
    }
    return true;
  }

  if (this.status === SUBSCRIPTION_STATUS.PAST_DUE) {
    const failedAt = this.paymentFailedAt || this.updatedAt || this.createdAt;
    const isWithinGrace = now.getTime() - new Date(failedAt).getTime() < GRACE_PERIOD_MS;
    return isWithinGrace;
  }

  return false;
};

export const Subscription = mongoose.model('Subscription', subscriptionSchema);
