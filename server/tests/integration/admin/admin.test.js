import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../../helpers/db.js';
import { generateAccessToken } from '../../../src/modules/auth/tokenService.js';
import { User } from '../../../src/modules/users/user.model.js';
import { CardBatch } from '../../../src/modules/cards/cardBatch.model.js';
import { Card } from '../../../src/modules/cards/card.model.js';
import { AuditLog } from '../../../src/modules/admin/auditLog.model.js';
import {
  ACCOUNT_STATE,
  ADMIN_ROLE,
} from '../../../src/config/constants.js';
import logger from '../../../src/utils/logger.js';

let app;
let mongoose;

const BASE = '/api/v1/admin';

beforeAll(async () => {
  const appModule = await import('../../../app.js');
  app = appModule.default;

  try {
    mongoose = await connectTestDb();
  } catch (err) {
    logger.warn('Failed to connect test db in admin.test.js', { error: err.message });
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

describe('Admin & Backoffice Capabilities', () => {
  let regularUser;
  let adminUser;
  let regularToken;
  let adminToken;

  beforeEach(async () => {
    if (skipIfNoDb()) {
      return;
    }

    regularUser = await User.create({
      email: 'member@onewinq.com',
      passwordHash: 'dummy',
      username: 'regular-member',
      displayName: 'Regular Member',
      accountState: ACCOUNT_STATE.ACTIVE,
      role: 'USER',
      emailVerified: true,
    });

    adminUser = await User.create({
      email: 'admin@onewinq.com',
      passwordHash: 'dummy',
      username: 'ops-admin',
      displayName: 'Ops Administrator',
      accountState: ACCOUNT_STATE.ACTIVE,
      role: ADMIN_ROLE.ADMIN,
      emailVerified: true,
    });

    regularToken = generateAccessToken({ userId: regularUser._id.toString() });
    adminToken = generateAccessToken({ userId: adminUser._id.toString() });
  });

  describe('Administrative Access Control', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get(`${BASE}/metrics`);
      expect(res.status).toBe(401);
    });

    it('rejects non-admin users with 403 Forbidden', async () => {
      if (skipIfNoDb()) {
        return;
      }

      const res = await request(app)
        .get(`${BASE}/metrics`)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('allows access to administrators', async () => {
      if (skipIfNoDb()) {
        return;
      }

      const res = await request(app)
        .get(`${BASE}/metrics`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.metrics).toBeDefined();
      expect(res.body.data.metrics.users.total).toBeGreaterThanOrEqual(2);
    });
  });

  describe('User Management & Status Override', () => {
    it('lists users with search query and status filtering', async () => {
      if (skipIfNoDb()) {
        return;
      }

      const res = await request(app)
        .get(`${BASE}/users?q=regular`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.users.length).toBe(1);
      expect(res.body.data.users[0].username).toBe('regular-member');
    });

    it('suspends a user account and writes an immutable audit log', async () => {
      if (skipIfNoDb()) {
        return;
      }

      const res = await request(app)
        .patch(`${BASE}/users/${regularUser._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: ACCOUNT_STATE.SUSPENDED,
          reason: 'Severe violation of community guidelines.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.user.accountState).toBe(ACCOUNT_STATE.SUSPENDED);

      // Verify user in DB is suspended
      const updated = await User.findById(regularUser._id);
      expect(updated.accountState).toBe(ACCOUNT_STATE.SUSPENDED);

      // Verify audit log entry
      const auditRes = await request(app)
        .get(`${BASE}/audit-logs`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(auditRes.status).toBe(200);
      expect(auditRes.body.data.logs.length).toBeGreaterThanOrEqual(1);
      expect(auditRes.body.data.logs[0].action).toBe('USER_STATUS_SUSPENDED');
      expect(auditRes.body.data.logs[0].targetId).toBe(regularUser._id.toString());

      const dbLogCount = await AuditLog.countDocuments({ targetId: regularUser._id.toString() });
      expect(dbLogCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Hardware Batch Provisioning', () => {
    it('provisions a batch and bulk generates cards', async () => {
      if (skipIfNoDb()) {
        return;
      }

      const res = await request(app)
        .post(`${BASE}/batches`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          batchNumber: 'BATCH-2026-PVC-TEST',
          cardType: 'pvc',
          totalCards: 10,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.cardsGenerated).toBe(10);

      // Verify batch created in DB
      const batch = await CardBatch.findOne({ batchNumber: 'BATCH-2026-PVC-TEST' });
      expect(batch).not.toBeNull();

      // Verify cards created in DB
      const count = await Card.countDocuments({ batchNumber: 'BATCH-2026-PVC-TEST' });
      expect(count).toBe(10);
    });
  });
});
