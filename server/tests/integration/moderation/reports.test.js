import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../../helpers/db.js';
import { generateAccessToken } from '../../../src/modules/auth/tokenService.js';
import { User } from '../../../src/modules/users/user.model.js';
import { Report } from '../../../src/modules/moderation/report.model.js';
import {
  ACCOUNT_STATE,
  REPORT_TARGET_TYPE,
  REPORT_REASON,
  REPORT_STATE,
} from '../../../src/config/constants.js';
import logger from '../../../src/utils/logger.js';

let app;
let mongoose;

const BASE = '/api/v1/reports';

beforeAll(async () => {
  const appModule = await import('../../../app.js');
  app = appModule.default;

  try {
    mongoose = await connectTestDb();
  } catch (err) {
    logger.warn('Failed to connect test db in reports.test.js', { error: err.message });
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

describe('Moderation & Abuse Reporting Lifecycle', () => {
  let reporterUser;
  let reportedUser;
  let reporterToken;

  beforeEach(async () => {
    if (skipIfNoDb()) {
      return;
    }

    reporterUser = await User.create({
      email: 'reporter@onewinq.com',
      passwordHash: 'dummy',
      username: 'reporter-usr',
      displayName: 'Reporter User',
      accountState: ACCOUNT_STATE.ACTIVE,
      emailVerified: true,
    });

    reportedUser = await User.create({
      email: 'reported@onewinq.com',
      passwordHash: 'dummy',
      username: 'reported-usr',
      displayName: 'Reported User',
      accountState: ACCOUNT_STATE.ACTIVE,
      emailVerified: true,
    });

    reporterToken = generateAccessToken({ userId: reporterUser._id.toString() });
  });

  describe('POST /api/v1/reports', () => {
    it('requires authentication', async () => {
      const res = await request(app)
        .post(BASE)
        .send({
          targetType: REPORT_TARGET_TYPE.PROFILE,
          targetId: '64b0f0000000000000000001',
          reason: REPORT_REASON.SPAM,
        });
      expect(res.status).toBe(401);
    });

    it('submits a report against a profile successfully', async () => {
      if (skipIfNoDb()) {
        return;
      }

      const res = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${reporterToken}`)
        .send({
          targetType: REPORT_TARGET_TYPE.PROFILE,
          targetId: reportedUser._id.toString(),
          reportedUser: reportedUser._id.toString(),
          reason: REPORT_REASON.HARASSMENT,
          description: 'User is sending abusive remarks on public links.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.report.status).toBe(REPORT_STATE.OPEN);
      expect(res.body.data.report.reason).toBe(REPORT_REASON.HARASSMENT);

      const dbReport = await Report.findById(res.body.data.report._id);
      expect(dbReport).not.toBeNull();
      expect(dbReport.reporter.toString()).toBe(reporterUser._id.toString());
    });

    it('prevents duplicate open reports against the same target', async () => {
      if (skipIfNoDb()) {
        return;
      }

      // First report
      await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${reporterToken}`)
        .send({
          targetType: REPORT_TARGET_TYPE.PROFILE,
          targetId: reportedUser._id.toString(),
          reason: REPORT_REASON.SPAM,
        });

      // Duplicate report attempt
      const res2 = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${reporterToken}`)
        .send({
          targetType: REPORT_TARGET_TYPE.PROFILE,
          targetId: reportedUser._id.toString(),
          reason: REPORT_REASON.HARASSMENT,
        });

      expect(res2.status).toBe(409);
      expect(res2.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/reports/me', () => {
    it('requires authentication', async () => {
      const res = await request(app).get(`${BASE}/me`);
      expect(res.status).toBe(401);
    });

    it('lists reports submitted by authenticated user', async () => {
      if (skipIfNoDb()) {
        return;
      }

      await Report.create({
        reporter: reporterUser._id,
        targetType: REPORT_TARGET_TYPE.CARD,
        targetId: 'CARD_SCAM_1',
        reason: REPORT_REASON.SCAM_FRAUD,
        status: REPORT_STATE.OPEN,
      });

      const res = await request(app)
        .get(`${BASE}/me`)
        .set('Authorization', `Bearer ${reporterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reports.length).toBe(1);
      expect(res.body.data.reports[0].targetId).toBe('CARD_SCAM_1');
    });
  });
});
