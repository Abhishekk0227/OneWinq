import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../../helpers/db.js';
import { generateAccessToken } from '../../../src/modules/auth/tokenService.js';
import { User } from '../../../src/modules/users/user.model.js';
import { ACCOUNT_STATE } from '../../../src/config/constants.js';

let app;
let mongoose;

const BASE = '/api/v1/connections';

beforeAll(async () => {
  const appModule = await import('../../../app.js');
  app = appModule.default;
  try {
    mongoose = (await import('mongoose')).default;
    await connectTestDb();
  } catch {
    // MongoDB not available
  }
});

beforeEach(async () => {
  await clearTestDb();
});

afterAll(async () => {
  await disconnectTestDb();
});

function skipIfNoDb() {
  return !mongoose || mongoose.connection.readyState !== 1;
}

describe('Connections Lifecycle', () => {
  let userA;
  let userB;
  let userC;
  let tokenA;
  let tokenB;

  beforeEach(async () => {
    if (skipIfNoDb()) {
      return;
    }

    userA = await User.create({
      email: 'userA@onewinq.com',
      passwordHash: 'dummy',
      username: 'usera',
      displayName: 'User Alpha',
      accountState: ACCOUNT_STATE.ACTIVE,
      emailVerified: true,
    });

    userB = await User.create({
      email: 'userB@onewinq.com',
      passwordHash: 'dummy',
      username: 'userb',
      displayName: 'User Beta',
      accountState: ACCOUNT_STATE.ACTIVE,
      emailVerified: true,
    });

    userC = await User.create({
      email: 'userC@onewinq.com',
      passwordHash: 'dummy',
      username: 'userc',
      displayName: 'User Gamma',
      accountState: ACCOUNT_STATE.ACTIVE,
      emailVerified: true,
    });

    tokenA = `Bearer ${generateAccessToken({ userId: userA._id.toString(), sessionId: 'sessA' })}`;
    tokenB = `Bearer ${generateAccessToken({ userId: userB._id.toString(), sessionId: 'sessB' })}`;
  });

  it('POST /api/v1/connections/request requires authentication', async () => {
    const res = await request(app)
      .post(`${BASE}/request`)
      .send({ targetUserId: '507f1f77bcf86cd799439011' });
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/connections/request sends a connection request', async () => {
    if (skipIfNoDb()) {
      return;
    }

    const res = await request(app)
      .post(`${BASE}/request`)
      .set('Authorization', tokenA)
      .send({ targetUserId: userB._id.toString(), note: 'Hi let us connect!' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PENDING_SENT');

    // Duplicate request fails
    const dupRes = await request(app)
      .post(`${BASE}/request`)
      .set('Authorization', tokenA)
      .send({ targetUserId: userB._id.toString() });

    expect(dupRes.status).toBe(409);
  });

  it('POST /api/v1/connections/request supports recipientId for backward-compatibility', async () => {
    if (skipIfNoDb()) {
      return;
    }

    const res = await request(app)
      .post(`${BASE}/request`)
      .set('Authorization', tokenA)
      .send({ recipientId: userC._id.toString(), note: 'Hi Gamma!' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PENDING_SENT');
  });

  it('accepts an incoming connection request', async () => {
    if (skipIfNoDb()) {
      return;
    }

    const sendRes = await request(app)
      .post(`${BASE}/request`)
      .set('Authorization', tokenA)
      .send({ targetUserId: userB._id.toString() });

    const requestId = sendRes.body.data.id;

    // Sender cannot accept their own request
    const badAccept = await request(app)
      .post(`${BASE}/${requestId}/accept`)
      .set('Authorization', tokenA);
    expect(badAccept.status).toBe(400);

    // Recipient accepts request
    const acceptRes = await request(app)
      .post(`${BASE}/${requestId}/accept`)
      .set('Authorization', tokenB);

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.status).toBe('CONNECTED');

    // Both users now list each other in connections
    const listA = await request(app).get(`${BASE}`).set('Authorization', tokenA);
    expect(listA.status).toBe(200);
    expect(listA.body.data.connections).toHaveLength(1);
    expect(listA.body.data.connections[0].user.id).toBe(userB._id.toString());
  });

  it('rejects an incoming connection request', async () => {
    if (skipIfNoDb()) {
      return;
    }

    const sendRes = await request(app)
      .post(`${BASE}/request`)
      .set('Authorization', tokenA)
      .send({ targetUserId: userB._id.toString() });

    const requestId = sendRes.body.data.id;

    const rejectRes = await request(app)
      .post(`${BASE}/${requestId}/reject`)
      .set('Authorization', tokenB);

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.message).toBe('Connection request rejected.');
  });

  it('withdraws an outgoing connection request', async () => {
    if (skipIfNoDb()) {
      return;
    }

    const sendRes = await request(app)
      .post(`${BASE}/request`)
      .set('Authorization', tokenA)
      .send({ targetUserId: userB._id.toString() });

    const requestId = sendRes.body.data.id;

    // Recipient cannot withdraw
    const badWithdraw = await request(app)
      .post(`${BASE}/${requestId}/withdraw`)
      .set('Authorization', tokenB);
    expect(badWithdraw.status).toBe(404);

    // Sender withdraws
    const withdrawRes = await request(app)
      .post(`${BASE}/${requestId}/withdraw`)
      .set('Authorization', tokenA);

    expect(withdrawRes.status).toBe(200);
    expect(withdrawRes.body.message).toBe('Connection request withdrawn.');
  });

  it('removes an active connection', async () => {
    if (skipIfNoDb()) {
      return;
    }

    // Connect userA and userB
    const sendRes = await request(app)
      .post(`${BASE}/request`)
      .set('Authorization', tokenA)
      .send({ targetUserId: userB._id.toString() });

    await request(app)
      .post(`${BASE}/${sendRes.body.data.id}/accept`)
      .set('Authorization', tokenB);

    // Disconnect
    const removeRes = await request(app)
      .delete(`${BASE}/${userB._id.toString()}`)
      .set('Authorization', tokenA);

    expect(removeRes.status).toBe(200);

    // List is now empty
    const listRes = await request(app).get(`${BASE}`).set('Authorization', tokenA);
    expect(listRes.body.data.connections).toHaveLength(0);
  });

  it('calculates mutual connections between two users', async () => {
    if (skipIfNoDb()) {
      return;
    }

    const tokenC = `Bearer ${generateAccessToken({ userId: userC._id.toString(), sessionId: 'sessC' })}`;

    // A connects with C
    const req1 = await request(app)
      .post(`${BASE}/request`)
      .set('Authorization', tokenA)
      .send({ targetUserId: userC._id.toString() });
    await request(app).post(`${BASE}/${req1.body.data.id}/accept`).set('Authorization', tokenC);

    // B connects with C
    const req2 = await request(app)
      .post(`${BASE}/request`)
      .set('Authorization', tokenB)
      .send({ targetUserId: userC._id.toString() });
    await request(app).post(`${BASE}/${req2.body.data.id}/accept`).set('Authorization', tokenC);

    // Mutual between A and B should be user C
    const mutualRes = await request(app)
      .get(`${BASE}/mutual/${userB._id.toString()}`)
      .set('Authorization', tokenA);

    expect(mutualRes.status).toBe(200);
    expect(mutualRes.body.data.mutualConnections).toHaveLength(1);
    expect(mutualRes.body.data.mutualConnections[0].id).toBe(userC._id.toString());
  });
});
