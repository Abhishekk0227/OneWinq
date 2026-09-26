import { z } from 'zod';
import { PLAN_TIER, BILLING_CYCLE } from '../../config/constants.js';

export const checkoutSchema = z.object({
  planCode: z
    .enum([PLAN_TIER.PRO, PLAN_TIER.BUSINESS, PLAN_TIER.ENTERPRISE], {
      errorMap: () => ({ message: 'Plan must be PRO, BUSINESS, or ENTERPRISE' }),
    }),
  billingCycle: z.enum([BILLING_CYCLE.MONTHLY, BILLING_CYCLE.YEARLY]).default(BILLING_CYCLE.MONTHLY),
});

export const cancelSubscriptionSchema = z.object({
  immediate: z.boolean().optional().default(false),
  reason: z.string().max(500).optional(),
});
