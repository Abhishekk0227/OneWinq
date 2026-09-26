import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../../helpers/db.js';
import { generateAccessToken } from '../../../src/modules/auth/tokenService.js';
import { User } from '../../../src/modules/users/user.model.js';
import { Subscription } from '../../../src/modules/subscriptions/subscription.model.js';
import { razorpayClient } from '../../../src/infrastructure/payment/razorpayClient.js';
import {
  PLAN_TIER,
  SUBSCRIPTION_STATUS,
  BILLING_CYCLE,
  ACCOUNT_STATE,
  ERROR_CODE,
} from '../../../src/config/constants.js';
import logger from '../../../src/utils/logger.js';

let app;
let mongoose;

const BASE = '/api/v1/subscriptions';

beforeAll(async () => {
  const appModule = await import('../../../app.js');
  app = appModule.default;

  try {
    mongoose = await connectTestDb();
  } catch (err) {
    logger.warn('Failed to connect test db in subscriptions.test.js', { error: err.message });
  }
});

afterEach(async () => {
  await clearTestDb();
});

afterAll(async () => {
  await disconnectTestDb();
});

function skipIfNoDb() {
  return !mongoose || mongoose.connection.readyState !== 1;
}

describe('Subscriptions, Monetization & Entitlements', () => {
  let user;
  let token;

  beforeEach(async () => {
    if (skipIfNoDb()) {
      return;
    }

    user = await User.create({
      email: 'subscriber@onewinq.com',
      passwordHash: 'dummy',
      username: 'subscriber-pro',
      displayName: 'Subscriber Pro',
      accountState: ACCOUNT_STATE.ACTIVE,
      emailVerified: true,
    });

    token = generateAccessToken({ userId: user._id.toString() });
  });

  describe('GET /api/v1/subscriptions/plans', () => {
    it('returns all active plans publicly', async () => {
      if (skipIfNoDb()) {
        return;
      }

      const res = await request(app).get(`${BASE}/plans`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.plans.length).toBeGreaterThanOrEqual(4);

      const codes = res.body.data.plans.map((p) => p.code);
      expect(codes).toContain(PLAN_TIER.FREE);
      expect(codes).toContain(PLAN_TIER.PRO);
      expect(codes).toContain(PLAN_TIER.BUSINESS);
      expect(codes).toContain(PLAN_TIER.ENTERPRISE);
    });
  });

  describe('GET /api/v1/subscriptions/me', () => {
    it('requires authentication', async () => {
      const res = await request(app).get(`${BASE}/me`);
      expect(res.status).toBe(401);
    });

    it('returns FREE tier entitlements for new user without active subscription', async () => {
      if (skipIfNoDb()) {
        return;
      }

      const res = await request(app)
        .get(`${BASE}/me`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.entitlements.planCode).toBe(PLAN_TIER.FREE);
      expect(res.body.data.entitlements.isFree).toBe(true);
      expect(res.body.data.entitlements.limits.maxProfiles).toBe(1);
    });
  });

  describe('POST /api/v1/subscriptions/checkout', () => {
    it('requires authentication', async () => {
      const res = await request(app)
        .post(`${BASE}/checkout`)
        .send({ planCode: PLAN_TIER.PRO, billingCycle: BILLING_CYCLE.MONTHLY });
      expect(res.status).toBe(401);
    });

    it('rejects checkout for FREE plan', async () => {
      if (skipIfNoDb()) {
        return;
      }

      const res = await request(app)
        .post(`${BASE}/checkout`)
        .set('Authorization', `Bearer ${token}`)
        .send({ planCode: PLAN_TIER.FREE });

      expect(res.status).toBe(400);
    });

    it('creates a checkout session and pending subscription record for PRO', async () => {
      if (skipIfNoDb()) {
        return;
      }

      const res = await request(app)
        .post(`${BASE}/checkout`)
        .set('Authorization', `Bearer ${token}`)
        .send({ planCode: PLAN_TIER.PRO, billingCycle: BILLING_CYCLE.MONTHLY });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.gatewaySubscriptionId).toBeDefined();
      expect(res.body.data.checkoutUrl).toBeDefined();
      expect(res.body.data.amount).toBe(299);

      // Verify pending subscription created in DB
      const sub = await Subscription.findOne({ userId: user._id });
      expect(sub).not.toBeNull();
      expect(sub.status).toBe(SUBSCRIPTION_STATUS.INCOMPLETE);
      expect(sub.planCode).toBe(PLAN_TIER.PRO);
    });
  });

  describe('Webhook and Lifecycle Integration', () => {
    it('rejects webhook with invalid signature', async () => {
      if (skipIfNoDb()) {
        return;
      }

      const payload = { event: 'subscription.activated', payload: {} };
      const res = await request(app)
        .post(`${BASE}/webhook`)
        .set('x-razorpay-signature', 'invalid_signature_hex')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe(ERROR_CODE.WEBHOOK_INVALID);
    });

    it('activates subscription on valid subscription.activated webhook event', async () => {
      if (skipIfNoDb()) {
        return;
      }

      // 1. Create checkout session
      const checkoutRes = await request(app)
        .post(`${BASE}/checkout`)
        .set('Authorization', `Bearer ${token}`)
        .send({ planCode: PLAN_TIER.PRO, billingCycle: BILLING_CYCLE.MONTHLY });

      const subId = checkoutRes.body.data.gatewaySubscriptionId;

      // 2. Simulate Razorpay webhook
      const webhookPayload = {
        event: 'subscription.activated',
        payload: {
          subscription: {
            entity: {
              id: subId,
              status: 'active',
              current_start: Math.floor(Date.now() / 1000),
              current_end: Math.floor((Date.now() + 30 * 86400000) / 1000),
            },
          },
        },
      };

      const rawBody = JSON.stringify(webhookPayload);
      const signature = razorpayClient.generateTestSignature(rawBody);

      const webhookRes = await request(app)
        .post(`${BASE}/webhook`)
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(rawBody);

      expect(webhookRes.status).toBe(200);
      expect(webhookRes.body.data.processed).toBe(true);

      // 3. User subscription status should now be ACTIVE with PRO entitlements
      const meRes = await request(app)
        .get(`${BASE}/me`)
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.data.entitlements.planCode).toBe(PLAN_TIER.PRO);
      expect(meRes.body.data.entitlements.isFree).toBe(false);
      expect(meRes.body.data.entitlements.limits.maxProfiles).toBe(3);
    });

    it('supports cancellation and resumption lifecycle', async () => {
      if (skipIfNoDb()) {
        return;
      }

      // Create an active subscription directly
      await Subscription.create({
        userId: user._id,
        planCode: PLAN_TIER.BUSINESS,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        gatewaySubscriptionId: 'sub_test_lifecycle_123',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      });

      // Cancel at period end
      const cancelRes = await request(app)
        .post(`${BASE}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({ immediate: false, reason: 'Testing cancel' });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.subscription.cancelAtPeriodEnd).toBe(true);

      // Resume subscription
      const resumeRes = await request(app)
        .post(`${BASE}/resume`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(resumeRes.status).toBe(200);
      expect(resumeRes.body.data.subscription.cancelAtPeriodEnd).toBe(false);
    });
  });
});
