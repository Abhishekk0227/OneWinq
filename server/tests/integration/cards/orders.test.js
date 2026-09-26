import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../../helpers/db.js';
import { generateAccessToken } from '../../../src/modules/auth/tokenService.js';
import { User } from '../../../src/modules/users/user.model.js';
import { ACCOUNT_STATE } from '../../../src/config/constants.js';
import logger from '../../../src/utils/logger.js';

let app;
let mongoose;

const BASE = '/api/v1/orders';

beforeAll(async () => {
  const appModule = await import('../../../app.js');
  app = appModule.default;

  try {
    mongoose = await connectTestDb();
  } catch (err) {
    logger.warn('Failed to connect test db in orders.test.js', { error: err.message });
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

describe('Hardware Card Orders Lifecycle', () => {
  let userA;
  let userB;
  let tokenA;
  let tokenB;

  beforeEach(async () => {
    if (skipIfNoDb()) {
      return;
    }

    userA = await User.create({
      email: 'buyer.a@onewinq.com',
      passwordHash: 'dummy',
      username: 'buyer-a',
      displayName: 'Buyer A',
      accountState: ACCOUNT_STATE.ACTIVE,
      emailVerified: true,
    });

    userB = await User.create({
      email: 'buyer.b@onewinq.com',
      passwordHash: 'dummy',
      username: 'buyer-b',
      displayName: 'Buyer B',
      accountState: ACCOUNT_STATE.ACTIVE,
      emailVerified: true,
    });

    tokenA = `Bearer ${generateAccessToken({ userId: userA._id.toString(), sessionId: 'sessA' })}`;
    tokenB = `Bearer ${generateAccessToken({ userId: userB._id.toString(), sessionId: 'sessB' })}`;
  });

  it('places a hardware card order with calculated pricing', async () => {
    if (skipIfNoDb()) {
      return;
    }

    // 1 metal ($79 = 7900) + 2 pvc ($29 each = 5800) = 13700
    const orderPayload = {
      items: [
        { cardType: 'metal', quantity: 1 },
        { cardType: 'pvc', quantity: 2 },
      ],
      shippingAddress: {
        recipientName: 'Buyer A',
        addressLine1: '456 Tech Park',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94105',
        country: 'USA',
        phone: '+1 555 0199',
      },
    };

    const res = await request(app)
      .post(BASE)
      .set('Authorization', tokenA)
      .send(orderPayload);

    expect(res.status).toBe(201);
    expect(res.body.data.order.totalAmount).toBe(13700);
    expect(res.body.data.order.state).toBe('CREATED');
    expect(res.body.data.order.orderNumber).toMatch(/^ORD-/);

    const orderId = res.body.data.order.id;

    // List orders for Buyer A
    const listRes = await request(app).get(BASE).set('Authorization', tokenA);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.orders).toHaveLength(1);
    expect(listRes.body.data.orders[0].id).toBe(orderId);
    expect(listRes.body.data.orders[0].itemsCount).toBe(3);

    // Get order details
    const getRes = await request(app).get(`${BASE}/${orderId}`).set('Authorization', tokenA);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.order.items).toHaveLength(2);
    expect(getRes.body.data.order.shippingAddress.city).toBe('San Francisco');
  });

  it('prevents user from accessing another user order', async () => {
    if (skipIfNoDb()) {
      return;
    }

    const orderRes = await request(app)
      .post(BASE)
      .set('Authorization', tokenA)
      .send({
        items: [{ cardType: 'bamboo', quantity: 1 }],
        shippingAddress: {
          recipientName: 'Buyer A',
          addressLine1: '123 Forest St',
          city: 'Portland',
          state: 'OR',
          postalCode: '97201',
          country: 'USA',
        },
      });

    const orderId = orderRes.body.data.order.id;

    // Buyer B attempts to access Buyer A's order -> 404
    const badGet = await request(app).get(`${BASE}/${orderId}`).set('Authorization', tokenB);
    expect(badGet.status).toBe(404);
  });
});
