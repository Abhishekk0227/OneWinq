import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../../helpers/db.js';
import { generateAccessToken } from '../../../src/modules/auth/tokenService.js';
import { User } from '../../../src/modules/users/user.model.js';
import { Card } from '../../../src/modules/cards/card.model.js';
import { RawEvent } from '../../../src/modules/analytics/rawEvent.model.js';
import { ProfileAnalytics } from '../../../src/modules/analytics/profileAnalytics.model.js';
import { CardAnalytics } from '../../../src/modules/analytics/cardAnalytics.model.js';
import { eventBus } from '../../../src/events/eventBus.js';
import { APP_EVENT, ACCOUNT_STATE, CARD_STATE } from '../../../src/config/constants.js';
import logger from '../../../src/utils/logger.js';

let app;
let mongoose;

const BASE = '/api/v1/analytics';

beforeAll(async () => {
  const appModule = await import('../../../app.js');
  app = appModule.default;

  try {
    mongoose = await connectTestDb();
  } catch (err) {
    logger.warn('Failed to connect test db in analytics.test.js', { error: err.message });
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

describe('Analytics Engine & Event Tracking', () => {
  let userA;
  let userB;
  let tokenA;
  let tokenB;
  let cardA;

  beforeEach(async () => {
    if (skipIfNoDb()) {
      return;
    }

    userA = await User.create({
      email: 'analytics.a@onewinq.com',
      passwordHash: 'dummy',
      username: 'analyst-a',
      displayName: 'Analyst A',
      accountState: ACCOUNT_STATE.ACTIVE,
      emailVerified: true,
    });

    userB = await User.create({
      email: 'analytics.b@onewinq.com',
      passwordHash: 'dummy',
      username: 'analyst-b',
      displayName: 'Analyst B',
      accountState: ACCOUNT_STATE.ACTIVE,
      emailVerified: true,
    });

    tokenA = `Bearer ${generateAccessToken({ userId: userA._id.toString(), sessionId: 'sessA' })}`;
    tokenB = `Bearer ${generateAccessToken({ userId: userB._id.toString(), sessionId: 'sessB' })}`;

    cardA = await Card.create({
      cardUid: 'ANALYTICS-CARD-1',
      secretHash: 'dummy',
      state: CARD_STATE.ACTIVE,
      assignedUser: userA._id,
      tapCount: 5,
      qrScanCount: 2,
    });
  });

  it('GET /api/v1/analytics/overview requires authentication', async () => {
    const res = await request(app).get(`${BASE}/overview`);
    expect(res.status).toBe(401);
  });

  it('records raw event and updates daily buckets on domain events', async () => {
    if (skipIfNoDb()) {
      return;
    }

    const iphoneUa =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1';

    // 1. Profile Viewed event
    eventBus.publish(APP_EVENT.PROFILE_VIEWED, {
      profileUserId: userA._id.toString(),
      viewerId: userB._id.toString(),
      ip: '127.0.0.1',
      userAgent: iphoneUa,
      timestamp: new Date(),
    });

    // 2. Card Tapped event
    eventBus.publish(APP_EVENT.CARD_TAPPED, {
      cardUid: cardA.cardUid,
      userId: userA._id.toString(),
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/115.0',
      timestamp: new Date(),
    });

    // Wait for async processing
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verify RawEvents recorded
    const rawEvents = await RawEvent.find({ targetUserId: userA._id });
    expect(rawEvents.length).toBeGreaterThanOrEqual(2);

    // Verify ProfileAnalytics incremented
    const profileBucket = await ProfileAnalytics.findOne({ userId: userA._id });
    expect(profileBucket).toBeDefined();
    expect(profileBucket.viewsCount).toBe(1);

    // Verify CardAnalytics incremented
    const cardBucket = await CardAnalytics.findOne({ cardUid: cardA.cardUid });
    expect(cardBucket).toBeDefined();
    expect(cardBucket.tapCount).toBe(1);
  });

  it('returns overview dashboard metrics and time-series', async () => {
    if (skipIfNoDb()) {
      return;
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    await ProfileAnalytics.create({
      userId: userA._id,
      date: today,
      viewsCount: 15,
      connectionsRequested: 3,
      connectionsAccepted: 2,
    });

    await CardAnalytics.create({
      cardUid: cardA.cardUid,
      userId: userA._id,
      date: today,
      tapCount: 8,
      scanCount: 4,
    });

    const res = await request(app).get(`${BASE}/overview?period=7d`).set('Authorization', tokenA);

    expect(res.status).toBe(200);
    expect(res.body.data.summary.totalViews).toBe(15);
    expect(res.body.data.summary.totalTaps).toBe(8);
    expect(res.body.data.summary.totalScans).toBe(4);
    expect(res.body.data.summary.connectionsAccepted).toBe(2);
    expect(res.body.data.profileTimeline).toHaveLength(1);
    expect(res.body.data.cardTimeline).toHaveLength(1);
  });

  it('returns profile traffic with device distribution', async () => {
    if (skipIfNoDb()) {
      return;
    }

    // Insert raw events with devices
    await RawEvent.create([
      {
        eventType: 'profile.viewed',
        targetUserId: userA._id,
        device: { deviceType: 'mobile', os: 'iOS', browser: 'Safari' },
      },
      {
        eventType: 'profile.viewed',
        targetUserId: userA._id,
        device: { deviceType: 'mobile', os: 'Android', browser: 'Chrome' },
      },
      {
        eventType: 'profile.viewed',
        targetUserId: userA._id,
        device: { deviceType: 'desktop', os: 'Windows', browser: 'Edge' },
      },
    ]);

    const res = await request(app).get(`${BASE}/profile`).set('Authorization', tokenA);

    expect(res.status).toBe(200);
    expect(res.body.data.deviceBreakdown.mobile).toBe(2);
    expect(res.body.data.deviceBreakdown.desktop).toBe(1);
  });

  it('returns specific card analytics and enforces ownership', async () => {
    if (skipIfNoDb()) {
      return;
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    await CardAnalytics.create({
      cardUid: cardA.cardUid,
      userId: userA._id,
      date: today,
      tapCount: 12,
      scanCount: 5,
    });

    // Owner accesses card analytics
    const res = await request(app)
      .get(`${BASE}/cards/${cardA.cardUid}`)
      .set('Authorization', tokenA);

    expect(res.status).toBe(200);
    expect(res.body.data.cardUid).toBe(cardA.cardUid);
    expect(res.body.data.summary.totalTaps).toBe(12);
    expect(res.body.data.summary.allTimeTaps).toBe(5);

    // Another user attempts to access -> 404
    const badRes = await request(app)
      .get(`${BASE}/cards/${cardA.cardUid}`)
      .set('Authorization', tokenB);

    expect(badRes.status).toBe(404);
  });

  it('tracks public link clicks', async () => {
    if (skipIfNoDb()) {
      return;
    }

    const res = await request(app)
      .post(`${BASE}/events/link-click`)
      .send({
        targetUserId: userA._id.toString(),
        linkUrl: 'https://linkedin.com/in/test-user',
        label: 'LinkedIn',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.tracked).toBe(true);

    const clickEvent = await RawEvent.findOne({
      targetUserId: userA._id,
      eventType: 'link.clicked',
    });
    expect(clickEvent).toBeDefined();
    expect(clickEvent.metadata.label).toBe('LinkedIn');
  });
});
