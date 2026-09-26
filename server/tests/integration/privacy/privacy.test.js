import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../../helpers/db.js';
import { generateAccessToken } from '../../../src/modules/auth/tokenService.js';
import { passwordService } from '../../../src/modules/auth/passwordService.js';
import { User } from '../../../src/modules/users/user.model.js';
import { DeletionRequest } from '../../../src/modules/privacy/deletionRequest.model.js';
import {
  ACCOUNT_STATE,
  DELETION_REQUEST_STATUS,
  DATA_EXPORT_STATUS,
} from '../../../src/config/constants.js';
import logger from '../../../src/utils/logger.js';

let app;
let mongoose;

const BASE = '/api/v1/privacy';

beforeAll(async () => {
  const appModule = await import('../../../app.js');
  app = appModule.default;

  try {
    mongoose = await connectTestDb();
  } catch (err) {
    logger.warn('Failed to connect test db in privacy.test.js', { error: err.message });
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

describe('Data Privacy, GDPR/DPDP Export & Deletion Lifecycle', () => {
  let user;
  let token;
  const rawPassword = 'MySecretPassword123!';

  beforeEach(async () => {
    if (skipIfNoDb()) {
      return;
    }

    const passwordHash = await passwordService.hashPassword(rawPassword);

    user = await User.create({
      email: 'privacy.user@onewinq.com',
      passwordHash,
      username: 'privacy-user',
      displayName: 'Privacy User',
      accountState: ACCOUNT_STATE.ACTIVE,
      emailVerified: true,
    });

    token = generateAccessToken({ userId: user._id.toString() });
  });

  describe('Data Export Workflow', () => {
    it('requires authentication for export endpoints', async () => {
      const res = await request(app).post(`${BASE}/export`);
      expect(res.status).toBe(401);
    });

    it('generates portable JSON data export archive and enforces 24-hour cooldown', async () => {
      if (skipIfNoDb()) {
        return;
      }

      // 1. First export request succeeds
      const res1 = await request(app)
        .post(`${BASE}/export`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res1.status).toBe(201);
      expect(res1.body.success).toBe(true);
      expect(res1.body.data.export.status).toBe(DATA_EXPORT_STATUS.READY);
      expect(res1.body.data.export.downloadUrl).toBeDefined();

      // 2. Query latest export
      const latestRes = await request(app)
        .get(`${BASE}/export/latest`)
        .set('Authorization', `Bearer ${token}`);

      expect(latestRes.status).toBe(200);
      expect(latestRes.body.data.export.id).toBe(res1.body.data.export.id);

      // 3. Download export
      const downloadRes = await request(app)
        .get(`${BASE}/export/download/${user._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(downloadRes.status).toBe(200);
      expect(downloadRes.header['content-type']).toContain('application/json');
      expect(downloadRes.body.account.email).toBe('privacy.user@onewinq.com');

      // 4. Second export request within 24 hours fails with 429 Too Many Requests
      const res2 = await request(app)
        .post(`${BASE}/export`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res2.status).toBe(429);
      expect(res2.body.success).toBe(false);
    });
  });

  describe('Account Deletion & 30-Day Cooling-off Lifecycle', () => {
    it('rejects deletion attempt with invalid password', async () => {
      if (skipIfNoDb()) {
        return;
      }

      const res = await request(app)
        .post(`${BASE}/delete-account`)
        .set('Authorization', `Bearer ${token}`)
        .send({ password: 'WrongPassword!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('schedules account deletion and supports restoration during cooling-off window', async () => {
      if (skipIfNoDb()) {
        return;
      }

      // 1. Schedule account deletion with correct password
      const deleteRes = await request(app)
        .post(`${BASE}/delete-account`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          password: rawPassword,
          reason: 'Moving to different platform',
        });

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);
      expect(deleteRes.body.data.deletionRequest.coolingOffDays).toBe(30);

      // 2. Verify account is in DELETION_PENDING state
      const dbUser = await User.findById(user._id);
      expect(dbUser.accountState).toBe(ACCOUNT_STATE.DELETION_PENDING);
      expect(dbUser.deletionScheduledFor).not.toBeNull();

      // 3. Verify DeletionRequest record in DB
      const delReq = await DeletionRequest.findOne({ userId: user._id });
      expect(delReq).not.toBeNull();
      expect(delReq.status).toBe(DELETION_REQUEST_STATUS.PENDING);

      // 4. Restore account
      const restoreRes = await request(app)
        .post(`${BASE}/restore-account`)
        .set('Authorization', `Bearer ${token}`);

      expect(restoreRes.status).toBe(200);
      expect(restoreRes.body.success).toBe(true);
      expect(restoreRes.body.data.user.accountState).toBe(ACCOUNT_STATE.ACTIVE);

      // 5. Verify account is ACTIVE again and deletion cancelled
      const restoredUser = await User.findById(user._id);
      expect(restoredUser.accountState).toBe(ACCOUNT_STATE.ACTIVE);
      expect(restoredUser.deletionScheduledFor).toBeNull();

      const cancelledReq = await DeletionRequest.findOne({ userId: user._id });
      expect(cancelledReq.status).toBe(DELETION_REQUEST_STATUS.CANCELLED);
    });
  });
});
