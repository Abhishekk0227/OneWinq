import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../../helpers/db.js';
import { generateAccessToken } from '../../../src/modules/auth/tokenService.js';
import { User } from '../../../src/modules/users/user.model.js';
import { Card } from '../../../src/modules/cards/card.model.js';
import { Order } from '../../../src/modules/cards/order.model.js';
import { Profile } from '../../../src/modules/profiles/profile.model.js';
import {
  ACCOUNT_STATE,
  ADMIN_ROLE,
  CARD_STATE,
  ORDER_STATE,
  PROFILE_STATE,
} from '../../../src/config/constants.js';

let app;
let mongoose;

const ADMIN_BASE = '/api/v1/admin';

beforeAll(async () => {
  const appModule = await import('../../../app.js');
  app = appModule.default;
  try {
    mongoose = await connectTestDb();
  } catch (err) {
    // Database connection error
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

describe('Admin Order Fulfillment & Hardware Card Pipeline', () => {
  let regularUser;
  let adminUser;
  let regularToken;
  let adminToken;

  beforeEach(async () => {
    if (skipIfNoDb()) return;

    regularUser = await User.create({
      email: 'customer@onewinq.com',
      passwordHash: 'dummy',
      username: 'kundankumar',
      displayName: 'Kundan Kumar',
      accountState: ACCOUNT_STATE.ACTIVE,
      role: 'USER',
      emailVerified: true,
    });

    adminUser = await User.create({
      email: 'admin@onewinq.com',
      passwordHash: 'dummy',
      username: 'lead-admin',
      displayName: 'Lead Admin',
      accountState: ACCOUNT_STATE.ACTIVE,
      role: ADMIN_ROLE.SUPER_ADMIN,
      emailVerified: true,
    });

    regularToken = generateAccessToken({
      userId: regularUser._id.toString(),
      role: regularUser.role,
    });

    adminToken = generateAccessToken({
      userId: adminUser._id.toString(),
      role: adminUser.role,
    });
  });

  it('rejects regular users from accessing admin orders endpoint (403)', async () => {
    if (skipIfNoDb()) return;

    const res = await request(app)
      .get(`${ADMIN_BASE}/orders`)
      .set('Authorization', `Bearer ${regularToken}`);

    expect(res.status).toBe(403);
  });

  it('allows admin to list customer orders and view accurate aggregation stats', async () => {
    if (skipIfNoDb()) return;

    // Create 2 test orders
    await Order.create({
      user: regularUser._id,
      orderNumber: 'ORD-TEST-001',
      state: ORDER_STATE.CREATED,
      items: [{ cardType: 'pvc', quantity: 1, unitPrice: 50000 }],
      totalAmount: 50000,
      currency: 'INR',
      shippingAddress: {
        recipientName: 'Kundan Kumar',
        addressLine1: 'Gaytri Mandir Road',
        city: 'Daltonganj',
        state: 'Jharkhand',
        postalCode: '822101',
        country: 'India',
      },
    });

    await Order.create({
      user: regularUser._id,
      orderNumber: 'ORD-TEST-002',
      state: ORDER_STATE.SHIPPED,
      items: [{ cardType: 'metallic', quantity: 1, unitPrice: 150000 }],
      totalAmount: 150000,
      currency: 'INR',
      shippingAddress: {
        recipientName: 'Kundan Kumar',
        addressLine1: 'Gaytri Mandir Road',
        city: 'Daltonganj',
        state: 'Jharkhand',
        postalCode: '822101',
        country: 'India',
      },
      trackingNumber: 'BD-99887766IN',
      carrier: 'BlueDart',
    });

    const res = await request(app)
      .get(`${ADMIN_BASE}/orders`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orders).toHaveLength(2);
    expect(res.body.data.stats.totalOrders).toBe(2);
    expect(res.body.data.stats.created).toBe(1);
    expect(res.body.data.stats.shipped).toBe(1);
    expect(res.body.data.stats.totalRevenue).toBe(150000);
  });

  it('allows admin to fulfill order: binds NFC card, activates customer profile, and marks SHIPPED with tracking', async () => {
    if (skipIfNoDb()) return;

    // 1. Customer creates a published profile (which is card-gated)
    await Profile.create({
      userId: regularUser._id,
      state: PROFILE_STATE.PUBLISHED,
      publishedData: { headline: 'Software Engineer', bio: 'Building cool things' },
      isActive: true,
      publishedAt: new Date(),
    });

    // Verify public profile is currently CARD-GATED
    const preCheck = await request(app).get(`/api/v1/public/u/${regularUser.username}`);
    expect(preCheck.status).toBe(200);
    expect(preCheck.body.data.isCardGated).toBe(true);
    expect(preCheck.body.data.hasActiveCard).toBe(false);
    expect(preCheck.body.data.profile).toBeNull();

    // 2. Customer places an order
    const order = await Order.create({
      user: regularUser._id,
      orderNumber: 'ORD-KUNDAN-001',
      state: ORDER_STATE.CREATED,
      items: [{ cardType: 'pvc', quantity: 1, unitPrice: 50000 }],
      totalAmount: 50000,
      currency: 'INR',
      shippingAddress: {
        recipientName: 'Kundan Kumar',
        addressLine1: 'Gaytri Mandir Road',
        city: 'Daltonganj',
        state: 'Jharkhand',
        postalCode: '822101',
        country: 'India',
      },
    });

    // 3. Admin generates an unassigned card in inventory
    const unassignedCard = await Card.create({
      cardCode: 'OWQ-CARD-000777',
      cardUid: 'OWQ-UID-000777',
      state: CARD_STATE.UNASSIGNED,
      status: CARD_STATE.UNASSIGNED,
      activationCode: '998877',
      edition: 'PVC',
    });

    // 4. Admin fulfills the order using this card
    const fulfillRes = await request(app)
      .post(`${ADMIN_BASE}/orders/${order._id}/fulfill`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        cardCode: 'OWQ-CARD-000777',
        carrier: 'BlueDart Express',
        trackingNumber: 'BD-12345678IN',
        state: ORDER_STATE.SHIPPED,
      });

    expect(fulfillRes.status).toBe(200);
    expect(fulfillRes.body.success).toBe(true);
    expect(fulfillRes.body.data.state).toBe(ORDER_STATE.SHIPPED);
    expect(fulfillRes.body.data.trackingNumber).toBe('BD-12345678IN');
    expect(fulfillRes.body.data.assignedCardUids).toContain('OWQ-CARD-000777');

    // 5. Verify the physical card is now ACTIVE and bound to Kundan
    const cardInDb = await Card.findById(unassignedCard._id);
    expect(cardInDb.state).toBe(CARD_STATE.ACTIVE);
    expect(cardInDb.assignedUser.toString()).toBe(regularUser._id.toString());
    expect(cardInDb.everAssigned).toBe(true);

    // 6. Verify Customer's public profile is now 100% UNLOCKED and LIVE
    const postCheck = await request(app).get(`/api/v1/public/u/${regularUser.username}`);
    expect(postCheck.status).toBe(200);
    expect(postCheck.body.data.isCardGated).toBe(false);
    expect(postCheck.body.data.hasActiveCard).toBe(true);
    expect(postCheck.body.data.activeCard.cardCode).toBe('OWQ-CARD-000777');
    expect(postCheck.body.data.profile.headline).toBe('Software Engineer');
  });

  it('allows admin to update tracking details and state without re-assigning cards', async () => {
    if (skipIfNoDb()) return;

    const order = await Order.create({
      user: regularUser._id,
      orderNumber: 'ORD-UPDATE-001',
      state: ORDER_STATE.CREATED,
      items: [{ cardType: 'pvc', quantity: 1, unitPrice: 50000 }],
      totalAmount: 50000,
      currency: 'INR',
      shippingAddress: {
        recipientName: 'Kundan Kumar',
        addressLine1: 'Gaytri Mandir Road',
        city: 'Daltonganj',
        state: 'Jharkhand',
        postalCode: '822101',
        country: 'India',
      },
    });

    const updateRes = await request(app)
      .patch(`${ADMIN_BASE}/orders/${order._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        state: ORDER_STATE.DELIVERED,
        carrier: 'Delhivery',
        trackingNumber: 'DLV-888999000',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.order.state).toBe(ORDER_STATE.DELIVERED);
    expect(updateRes.body.data.order.carrier).toBe('Delhivery');
    expect(updateRes.body.data.order.trackingNumber).toBe('DLV-888999000');
  });
});
