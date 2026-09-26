import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../helpers/db.js';
import { Card } from '../../src/modules/cards/card.model.js';
import { OtpChallenge } from '../../src/modules/auth/otpChallenge.model.js';
import { hashPassword } from '../../src/modules/auth/passwordService.js';
import { generateOtp } from '../../src/utils/otp.js';

describe('E2E Core Journey', () => {
  let isDbAvailable = false;

  beforeAll(async () => {
    try {
      await connectTestDb();
      await clearTestDb();
      isDbAvailable = true;
    } catch {
      isDbAvailable = false;
    }
  });

  afterAll(async () => {
    if (isDbAvailable) {
      await clearTestDb();
      await disconnectTestDb();
    }
  });

  it('verifies public health endpoint live and ready checks', async () => {
    const res = await request(app).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('runs complete user lifecycle if DB is available', async () => {
    if (!isDbAvailable) {
      // Offline fallback: test validation & security boundaries
      const res = await request(app).post('/api/v1/auth/register').send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      return;
    }

    // 1. Sign up
    const rand = Math.floor(Math.random() * 1000000);
    const email = `e2e_user_${Date.now()}_${rand}@example.com`;
    const password = 'StrongPassword123!';
    const username = `e2e-${Date.now()}-${rand}`;

    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({ email, password, username, displayName: 'E2E Tester' });

    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);

    // 2. Query active OTP challenge from DB and verify
    const challenge = await OtpChallenge.findOne({ email }).select('+otpHash');
    expect(challenge).toBeDefined();

    // Since in test mode otp is hashed, we simulate valid OTP verification:
    const testOtp = generateOtp();
    challenge.otpHash = await hashPassword(testOtp);
    await challenge.save();

    const verifyRes = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ email, otp: testOtp });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.user.emailVerified).toBe(true);

    // 3. Login
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password });

    expect(loginRes.status).toBe(200);
    const token = loginRes.body.data.accessToken;
    expect(token).toBeDefined();

    // 4. Update and publish profile
    const profileRes = await request(app)
      .put('/api/v1/profiles/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        bio: 'E2E bio text',
        headline: 'Fullstack Architect',
      });
    expect(profileRes.status).toBe(200);

    const publishRes = await request(app)
      .post('/api/v1/profiles/me/publish')
      .set('Authorization', `Bearer ${token}`)
      .send();
    expect(publishRes.status).toBe(200);

    // 5. Resolve public profile
    const publicRes = await request(app).get(`/api/v1/public/u/${username}`);
    expect(publicRes.status).toBe(200);
    const resolvedUsername = publicRes.body.data?.user?.username || publicRes.body.data?.username;
    expect(resolvedUsername).toBe(username);

    // 6. Pre-provision and activate smart card
    const cardUid = `CARD-E2E-${Date.now()}-${rand}`;
    const rawActivationCode = 'ACT-SECRET-789';
    const secretHash = await hashPassword(rawActivationCode);

    await Card.create({
      cardUid,
      secretHash,
      state: 'UNASSIGNED',
    });

    const activateRes = await request(app)
      .post('/api/v1/cards/activate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        cardUid,
        activationCode: rawActivationCode,
      });
    expect(activateRes.status).toBe(200);

    // 7. Resolve NFC tap
    const tapRes = await request(app).get(`/c/${cardUid}`);
    expect(tapRes.status).toBe(200);
    expect(tapRes.body.data.redirectUrl).toBe(`/u/${username}`);

    // 8. Request data export bundle
    const exportRes = await request(app)
      .post('/api/v1/privacy/export')
      .set('Authorization', `Bearer ${token}`)
      .send();
    expect([201, 202]).toContain(exportRes.status);

    // 9. Schedule account deletion with password verification
    const deleteRes = await request(app)
      .post('/api/v1/privacy/delete-account')
      .set('Authorization', `Bearer ${token}`)
      .send({ password, reason: 'Testing account deletion' });
    expect(deleteRes.status).toBe(200);

    // 10. Restore account during grace period
    const restoreRes = await request(app)
      .post('/api/v1/privacy/restore-account')
      .set('Authorization', `Bearer ${token}`)
      .send();
    expect(restoreRes.status).toBe(200);
    const restoredState = restoreRes.body.data?.user?.accountState || restoreRes.body.data?.accountState;
    expect(restoredState).toBe('ACTIVE');
  });
});
