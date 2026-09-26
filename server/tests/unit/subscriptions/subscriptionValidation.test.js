import { describe, it, expect } from 'vitest';
import {
  checkoutSchema,
  cancelSubscriptionSchema,
} from '../../../src/modules/subscriptions/subscription.validation.js';
import { PLAN_TIER, BILLING_CYCLE } from '../../../src/config/constants.js';

describe('Subscription Validation Unit Tests', () => {
  describe('checkoutSchema', () => {
    it('accepts valid PRO and BUSINESS plans with default monthly cycle', () => {
      const res1 = checkoutSchema.safeParse({ planCode: PLAN_TIER.PRO });
      expect(res1.success).toBe(true);
      expect(res1.data.billingCycle).toBe(BILLING_CYCLE.MONTHLY);

      const res2 = checkoutSchema.safeParse({
        planCode: PLAN_TIER.BUSINESS,
        billingCycle: BILLING_CYCLE.YEARLY,
      });
      expect(res2.success).toBe(true);
      expect(res2.data.billingCycle).toBe(BILLING_CYCLE.YEARLY);
    });

    it('rejects FREE plan in checkout', () => {
      const res = checkoutSchema.safeParse({ planCode: PLAN_TIER.FREE });
      expect(res.success).toBe(false);
    });

    it('rejects invalid plan code and invalid billing cycle', () => {
      const res = checkoutSchema.safeParse({
        planCode: 'DIAMOND',
        billingCycle: 'BIWEEKLY',
      });
      expect(res.success).toBe(false);
    });
  });

  describe('cancelSubscriptionSchema', () => {
    it('accepts empty object with default immediate=false', () => {
      const res = cancelSubscriptionSchema.safeParse({});
      expect(res.success).toBe(true);
      expect(res.data.immediate).toBe(false);
    });

    it('accepts immediate=true and reason string', () => {
      const res = cancelSubscriptionSchema.safeParse({
        immediate: true,
        reason: 'Too expensive for current needs',
      });
      expect(res.success).toBe(true);
      expect(res.data.immediate).toBe(true);
      expect(res.data.reason).toBe('Too expensive for current needs');
    });
  });
});
