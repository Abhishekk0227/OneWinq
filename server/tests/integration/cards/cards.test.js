import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../../helpers/db.js';
import { generateAccessToken } from '../../../src/modules/auth/tokenService.js';
import { hashPassword } from '../../../src/modules/auth/passwordService.js';
import { User } from '../../../src/modules/users/user.model.js';
import { Card } from '../../../src/modules/cards/card.model.js';
import { ACCOUNT_STATE, CARD_STATE } from '../../../src/config/constants.js';
import logger from '../../../src/utils/logger.js';

let app;
let mongoose;

const BASE = '/api/v1/cards';

beforeAll(async () => {
  const appModule = await import('../../../app.js');
  app = appModule.default;

  try {
    mongoose = await connectTestDb();
  } catch (err) {
    logger.warn('Failed to connect test db in cards.test.js', { error: err.message });
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

describe('Cards & NFC/QR Lifecycle', () => {
  let userA;
  let userB;
  let tokenA;
  let tokenB;
  let rawCode;
  let secretHash;

  beforeEach(async () => {
    if (skipIfNoDb()) {
      return;
    }

    userA = await User.create({
      email: 'carduser.a@onewinq.com',
      passwordHash: 'dummy',
      username: 'card-owner',
      displayName: 'Card Owner',
      accountState: ACCOUNT_STATE.ACTIVE,
      emailVerified: true,
    });

    userB = await User.create({
      email: 'carduser.b@onewinq.com',
      passwordHash: 'dummy',
      username: 'other-user',
      displayName: 'Other User',
      accountState: ACCOUNT_STATE.ACTIVE,
      emailVerified: true,
    });

    tokenA = `Bearer ${generateAccessToken({ userId: userA._id.toString(), sessionId: 'sessA' })}`;
    tokenB = `Bearer ${generateAccessToken({ userId: userB._id.toString(), sessionId: 'sessB' })}`;

    rawCode = 'ACTIVATE-SECRET-9999';
    secretHash = await hashPassword(rawCode);

    await Card.create({
      cardUid: 'OWQ123456789',
      secretHash,
      state: CARD_STATE.UNASSIGNED,
      material: 'metal',
    });
  });

  it('claims and activates an unassigned card with valid secret', async () => {
    if (skipIfNoDb()) {
      return;
    }

    const res = await request(app)
      .post(`${BASE}/activate`)
      .set('Authorization', tokenA)
      .send({
        cardUid: 'OWQ123456789',
        activationCode: rawCode,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.cardUid).toBe('OWQ123456789');
    expect(res.body.data.state).toBe('ACTIVE');
    expect(res.body.data.assignedUser).toBe(userA._id.toString());

    // Verify card in database
    const inDb = await Card.findOne({ cardUid: 'OWQ123456789' });
    expect(inDb.state).toBe(CARD_STATE.ACTIVE);
    expect(inDb.assignedUser.toString()).toBe(userA._id.toString());
  });

  it('rejects card activation with invalid activation code', async () => {
    if (skipIfNoDb()) {
      return;
    }

    const res = await request(app)
      .post(`${BASE}/activate`)
      .set('Authorization', tokenA)
      .send({
        cardUid: 'OWQ123456789',
        activationCode: 'WRONG-SECRET-CODE',
      });

    expect(res.status).toBe(400);
  });

  it('resolves public NFC tap and QR scan for active cards', async () => {
    if (skipIfNoDb()) {
      return;
    }

    // First activate card for User A
    await request(app)
      .post(`${BASE}/activate`)
      .set('Authorization', tokenA)
      .send({
        cardUid: 'OWQ123456789',
        activationCode: rawCode,
      });

    // Public NFC tap via API route
    const tapRes = await request(app).get(`${BASE}/tap/OWQ123456789`);
    expect(tapRes.status).toBe(200);
    expect(tapRes.body.data.username).toBe('card-owner');
    expect(tapRes.body.data.redirectUrl).toBe('/u/card-owner');

    // Public NFC tap via vanity root route /c/:cardUid
    const rootTapRes = await request(app).get('/c/OWQ123456789');
    expect(rootTapRes.status).toBe(200);
    expect(rootTapRes.body.data.username).toBe('card-owner');

    // Public QR scan
    const scanRes = await request(app).get(`${BASE}/scan/OWQ123456789`);
    expect(scanRes.status).toBe(200);
    expect(scanRes.body.data.username).toBe('card-owner');

    // Verify metrics updated
    const cardInDb = await Card.findOne({ cardUid: 'OWQ123456789' });
    expect(cardInDb.tapCount).toBe(2);
    expect(cardInDb.qrScanCount).toBe(1);
    expect(cardInDb.lastTappedAt).toBeDefined();
    expect(cardInDb.lastScannedAt).toBeDefined();
  });

  it('blocks tap resolution when card is frozen/blocked by owner', async () => {
    if (skipIfNoDb()) {
      return;
    }

    // Activate card
    await request(app)
      .post(`${BASE}/activate`)
      .set('Authorization', tokenA)
      .send({
        cardUid: 'OWQ123456789',
        activationCode: rawCode,
      });

    // Owner freezes card
    const freezeRes = await request(app)
      .patch(`${BASE}/OWQ123456789/state`)
      .set('Authorization', tokenA)
      .send({ state: 'BLOCKED' });

    expect(freezeRes.status).toBe(200);
    expect(freezeRes.body.data.card.state).toBe('BLOCKED');

    // Public tap now returns 403 Forbidden
    const tapRes = await request(app).get(`${BASE}/tap/OWQ123456789`);
    expect(tapRes.status).toBe(403);

    // Owner unfreezes card
    const unfreezeRes = await request(app)
      .patch(`${BASE}/OWQ123456789/state`)
      .set('Authorization', tokenA)
      .send({ state: 'ACTIVE' });

    expect(unfreezeRes.status).toBe(200);

    // Public tap succeeds again
    const tapAgain = await request(app).get(`${BASE}/tap/OWQ123456789`);
    expect(tapAgain.status).toBe(200);
  });

  it('updates card vanity slug and prevents duplicate vanity slugs', async () => {
    if (skipIfNoDb()) {
      return;
    }

    // Activate test card for User A
    await request(app)
      .post(`${BASE}/activate`)
      .set('Authorization', tokenA)
      .send({
        cardUid: 'OWQ123456789',
        activationCode: rawCode,
      });

    // Set custom slug
    const updateRes = await request(app)
      .patch(`${BASE}/OWQ123456789`)
      .set('Authorization', tokenA)
      .send({ customSlug: 'alice-vip-card' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.card.customSlug).toBe('alice-vip-card');

    // User B tries to claim the same custom slug on a different card -> Conflict 409
    const card2 = await Card.create({
      cardUid: 'OWQ987654321',
      secretHash,
      state: CARD_STATE.ACTIVE,
      assignedUser: userB._id,
    });

    const dupRes = await request(app)
      .patch(`${BASE}/${card2.cardUid}`)
      .set('Authorization', tokenB)
      .send({ customSlug: 'alice-vip-card' });

    expect(dupRes.status).toBe(409);
  });

  it('prevents unauthorized user from viewing or modifying another user card', async () => {
    if (skipIfNoDb()) {
      return;
    }

    // Activate for User A
    await request(app)
      .post(`${BASE}/activate`)
      .set('Authorization', tokenA)
      .send({
        cardUid: 'OWQ123456789',
        activationCode: rawCode,
      });

    // User B attempts to access User A's card details
    const getRes = await request(app)
      .get(`${BASE}/OWQ123456789`)
      .set('Authorization', tokenB);
    expect(getRes.status).toBe(404);

    // User B attempts to freeze User A's card
    const patchRes = await request(app)
      .patch(`${BASE}/OWQ123456789/state`)
      .set('Authorization', tokenB)
      .send({ state: 'BLOCKED' });
    expect(patchRes.status).toBe(404);
  });
});
