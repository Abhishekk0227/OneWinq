import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../../helpers/db.js';
import { generateAccessToken } from '../../../src/modules/auth/tokenService.js';
import { User } from '../../../src/modules/users/user.model.js';
import { Profile } from '../../../src/modules/profiles/profile.model.js';
import { ACCOUNT_STATE, PROFILE_STATE } from '../../../src/config/constants.js';

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

describe('Blocking & Mutual Visibility Shielding', () => {
  let userA;
  let userB;
  let tokenA;
  let tokenB;

  beforeEach(async () => {
    if (skipIfNoDb()) {
      return;
    }

    userA = await User.create({
      email: 'blocker@onewinq.com',
      passwordHash: 'dummy',
      username: 'blocker-user',
      displayName: 'Blocker User',
      accountState: ACCOUNT_STATE.ACTIVE,
      emailVerified: true,
    });

    userB = await User.create({
      email: 'target@onewinq.com',
      passwordHash: 'dummy',
      username: 'target-user',
      displayName: 'Target User',
      accountState: ACCOUNT_STATE.ACTIVE,
      emailVerified: true,
    });

    await Profile.create({
      userId: userA._id,
      state: PROFILE_STATE.PUBLISHED,
      publishedData: { headline: 'Blocker profile' },
      publishedAt: new Date(),
    });

    await Profile.create({
      userId: userB._id,
      state: PROFILE_STATE.PUBLISHED,
      publishedData: { headline: 'Target profile' },
      publishedAt: new Date(),
    });

    tokenA = `Bearer ${generateAccessToken({ userId: userA._id.toString(), sessionId: 'sessA' })}`;
    tokenB = `Bearer ${generateAccessToken({ userId: userB._id.toString(), sessionId: 'sessB' })}`;
  });

  it('blocks a user and severs connection', async () => {
    if (skipIfNoDb()) {
      return;
    }

    const blockRes = await request(app)
      .post(`${BASE}/block/${userB._id.toString()}`)
      .set('Authorization', tokenA);

    expect(blockRes.status).toBe(200);
    expect(blockRes.body.message).toBe('User blocked successfully.');

    // Blocked user tries to send connection request -> rejected
    const reqRes = await request(app)
      .post(`${BASE}/request`)
      .set('Authorization', tokenB)
      .send({ targetUserId: userA._id.toString() });

    expect(reqRes.status).toBe(404); // Shielded — acts as if user does not exist
  });

  it('shields public profile when mutually blocked', async () => {
    if (skipIfNoDb()) {
      return;
    }

    // User A blocks User B
    await request(app).post(`${BASE}/block/${userB._id.toString()}`).set('Authorization', tokenA);

    // User B attempts to view User A's public profile -> returns 404
    const res = await request(app)
      .get('/api/v1/public/u/blocker-user')
      .set('Authorization', tokenB);

    expect(res.status).toBe(404);
  });

  it('lists blocked users and supports unblocking', async () => {
    if (skipIfNoDb()) {
      return;
    }

    // User A blocks User B
    await request(app).post(`${BASE}/block/${userB._id.toString()}`).set('Authorization', tokenA);

    // List blocked
    const listRes = await request(app).get(`${BASE}/blocks`).set('Authorization', tokenA);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.blockedUsers).toHaveLength(1);
    expect(listRes.body.data.blockedUsers[0].user.id).toBe(userB._id.toString());

    // Unblock
    const unblockRes = await request(app)
      .delete(`${BASE}/block/${userB._id.toString()}`)
      .set('Authorization', tokenA);
    expect(unblockRes.status).toBe(200);

    // List is now empty
    const emptyList = await request(app).get(`${BASE}/blocks`).set('Authorization', tokenA);
    expect(emptyList.body.data.blockedUsers).toHaveLength(0);
  });
});
