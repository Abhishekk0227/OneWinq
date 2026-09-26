import mongoose from 'mongoose';
import { Subscription } from './subscription.model.js';
import { Plan } from './plan.model.js';
import { PLAN_TIER, DEFAULT_PLAN_LIMITS, ERROR_CODE, HTTP } from '../../config/constants.js';
import { AppError } from '../../shared/errors.js';

class EntitlementService {
  /**
   * Resolves the effective plan and subscription for a user.
   * Seamlessly falls back to FREE tier if no active subscription exists.
   * @param {string|mongoose.Types.ObjectId} userId
   * @returns {Promise<{ planCode: string, subscription: object|null, isFree: boolean }>}
   */
  async resolveUserPlan(userId) {
    if (!userId || mongoose.connection?.readyState !== 1) {
      return { planCode: PLAN_TIER.FREE, subscription: null, isFree: true };
    }

    const sub = await Subscription.findOne({ userId })
      .sort({ updatedAt: -1, createdAt: -1 });

    if (sub && sub.hasEntitlementAccess()) {
      return {
        planCode: sub.planCode,
        subscription: sub,
        isFree: sub.planCode === PLAN_TIER.FREE,
      };
    }

    return {
      planCode: PLAN_TIER.FREE,
      subscription: sub || null,
      isFree: true,
    };
  }

  /**
   * Returns the full entitlement profile for a user.
   * @param {string|mongoose.Types.ObjectId} userId
   * @returns {Promise<object>}
   */
  async getEntitlements(userId) {
    const { planCode, subscription, isFree } = await this.resolveUserPlan(userId);

    // Fetch plan config from DB if available, else use default constants
    let planData = null;
    if (mongoose.connection?.readyState === 1) {
      try {
        planData = await Plan.findOne({ code: planCode });
      } catch {
        planData = null;
      }
    }

    if (!planData) {
      const defaults = Plan.getDefaultPlans();
      planData = defaults.find((p) => p.code === planCode) || defaults[0];
    }

    const fallbackLimits = DEFAULT_PLAN_LIMITS[planCode] || DEFAULT_PLAN_LIMITS.FREE;
    const limits = {
      maxProfiles: planData.limits?.maxProfiles ?? fallbackLimits.maxProfiles,
      maxCards: planData.limits?.maxCards ?? fallbackLimits.maxCards,
      analyticsRetentionDays:
        planData.limits?.analyticsRetentionDays ?? fallbackLimits.analyticsRetentionDays,
    };

    const features = planData.features?.length > 0 ? planData.features : fallbackLimits.features;

    return {
      planCode,
      isFree,
      status: subscription?.status || 'ACTIVE',
      billingCycle: subscription?.billingCycle || null,
      currentPeriodStart: subscription?.currentPeriodStart || null,
      currentPeriodEnd: subscription?.currentPeriodEnd || null,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
      trialEnd: subscription?.trialEnd || null,
      isGracePeriod: subscription?.status === 'PAST_DUE',
      limits,
      features,
    };
  }

  /**
   * Checks whether a user is entitled to a specific feature flag.
   * @param {string|mongoose.Types.ObjectId} userId
   * @param {string} featureFlag
   * @returns {Promise<boolean>}
   */
  async hasFeature(userId, featureFlag) {
    const entitlements = await this.getEntitlements(userId);
    return entitlements.features.includes(featureFlag);
  }

  /**
   * Asserts that a user has not exceeded their numeric plan limits.
   * Throws AppError if limit reached.
   * @param {string|mongoose.Types.ObjectId} userId
   * @param {'maxProfiles'|'maxCards'} limitKey
   * @param {number} currentCount
   */
  async assertWithinLimit(userId, limitKey, currentCount) {
    const entitlements = await this.getEntitlements(userId);
    const maxAllowed = entitlements.limits[limitKey];

    if (maxAllowed !== undefined && currentCount >= maxAllowed) {
      throw new AppError(
        `You have reached the limit of ${maxAllowed} for your current plan (${entitlements.planCode}). Please upgrade your plan to continue.`,
        ERROR_CODE.PLAN_UPGRADE_REQUIRED,
        HTTP.FORBIDDEN
      );
    }
  }
}

export const entitlementService = new EntitlementService();
