import { describe, it, expect } from 'vitest';
import { entitlementService } from '../../../src/modules/subscriptions/entitlement.service.js';
import { Subscription } from '../../../src/modules/subscriptions/subscription.model.js';
import {
  PLAN_TIER,
  SUBSCRIPTION_STATUS,
  FEATURE_FLAG,
  DEFAULT_PLAN_LIMITS,
  ERROR_CODE,
} from '../../../src/config/constants.js';

describe('Entitlement Service Unit Tests', () => {
  it('falls back to FREE tier when user has no subscription record', async () => {
    const entitlements = await entitlementService.getEntitlements(null);
    expect(entitlements.planCode).toBe(PLAN_TIER.FREE);
    expect(entitlements.isFree).toBe(true);
    expect(entitlements.limits.maxProfiles).toBe(DEFAULT_PLAN_LIMITS.FREE.maxProfiles);
    expect(entitlements.limits.maxCards).toBe(DEFAULT_PLAN_LIMITS.FREE.maxCards);
    expect(entitlements.features).toEqual([]);

    const hasAdvanced = await entitlementService.hasFeature(null, FEATURE_FLAG.ADVANCED_ANALYTICS);
    expect(hasAdvanced).toBe(false);
  });

  it('correctly evaluates hasEntitlementAccess for ACTIVE and TRIALING subscriptions', () => {
    const activeSub = new Subscription({
      userId: '64b0f0000000000000000001',
      planCode: PLAN_TIER.PRO,
      status: SUBSCRIPTION_STATUS.ACTIVE,
      currentPeriodEnd: new Date(Date.now() + 10 * 86400000),
    });
    expect(activeSub.hasEntitlementAccess()).toBe(true);

    const trialingSub = new Subscription({
      userId: '64b0f0000000000000000001',
      planCode: PLAN_TIER.BUSINESS,
      status: SUBSCRIPTION_STATUS.TRIALING,
    });
    expect(trialingSub.hasEntitlementAccess()).toBe(true);
  });

  it('grants grace period access for PAST_DUE subscriptions within 3 days', () => {
    const recentFailedSub = new Subscription({
      userId: '64b0f0000000000000000001',
      planCode: PLAN_TIER.PRO,
      status: SUBSCRIPTION_STATUS.PAST_DUE,
      paymentFailedAt: new Date(Date.now() - 1 * 86400000), // 1 day ago
    });
    expect(recentFailedSub.hasEntitlementAccess()).toBe(true);

    const oldFailedSub = new Subscription({
      userId: '64b0f0000000000000000001',
      planCode: PLAN_TIER.PRO,
      status: SUBSCRIPTION_STATUS.PAST_DUE,
      paymentFailedAt: new Date(Date.now() - 5 * 86400000), // 5 days ago (past 3-day grace)
    });
    expect(oldFailedSub.hasEntitlementAccess()).toBe(false);
  });

  it('denies access for EXPIRED or CANCELLED subscriptions', () => {
    const cancelledSub = new Subscription({
      userId: '64b0f0000000000000000001',
      planCode: PLAN_TIER.PRO,
      status: SUBSCRIPTION_STATUS.CANCELLED,
    });
    expect(cancelledSub.hasEntitlementAccess()).toBe(false);

    const expiredSub = new Subscription({
      userId: '64b0f0000000000000000001',
      planCode: PLAN_TIER.PRO,
      status: SUBSCRIPTION_STATUS.EXPIRED,
    });
    expect(expiredSub.hasEntitlementAccess()).toBe(false);
  });

  it('throws PLAN_UPGRADE_REQUIRED when assertWithinLimit exceeds tier limits', async () => {
    try {
      await entitlementService.assertWithinLimit(null, 'maxProfiles', 1);
      expect.unreachable('Should have thrown AppError');
    } catch (err) {
      expect(err.code).toBe(ERROR_CODE.PLAN_UPGRADE_REQUIRED);
      expect(err.statusCode).toBe(403);
    }
  });

  it('does not throw when count is strictly below tier limits', async () => {
    await expect(
      entitlementService.assertWithinLimit(null, 'maxProfiles', 0)
    ).resolves.toBeUndefined();
  });
});
