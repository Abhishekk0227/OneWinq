import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../../helpers/db.js';
import { generateAccessToken } from '../../../src/modules/auth/tokenService.js';
import { User } from '../../../src/modules/users/user.model.js';
import { Notification } from '../../../src/modules/notifications/notification.model.js';
import { eventBus } from '../../../src/events/eventBus.js';
import { APP_EVENT, ACCOUNT_STATE } from '../../../src/config/constants.js';
import logger from '../../../src/utils/logger.js';

let app;
let mongoose;

const BASE = '/api/v1/notifications';

beforeAll(async () => {
  const appModule = await import('../../../app.js');
  app = appModule.default;

  try {
    mongoose = await connectTestDb();
  } catch (err) {
    logger.warn('Failed to connect test db in notifications.test.js', { error: err.message });
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

describe('Notifications & Preferences Lifecycle', () => {
  let userA;
  let userB;
  let tokenA;
  let tokenB;

  beforeEach(async () => {
    if (skipIfNoDb()) {
      return;
    }

    userA = await User.create({
      email: 'alice.notify@onewinq.com',
      passwordHash: 'dummy',
      username: 'alice-notify',
      displayName: 'Alice Notify',
      accountState: ACCOUNT_STATE.ACTIVE,
      emailVerified: true,
    });

    userB = await User.create({
      email: 'bob.notify@onewinq.com',
      passwordHash: 'dummy',
      username: 'bob-notify',
      displayName: 'Bob Notify',
      accountState: ACCOUNT_STATE.ACTIVE,
      emailVerified: true,
    });

    tokenA = `Bearer ${generateAccessToken({ userId: userA._id.toString(), sessionId: 'sessA' })}`;
    tokenB = `Bearer ${generateAccessToken({ userId: userB._id.toString(), sessionId: 'sessB' })}`;
  });

  it('GET /api/v1/notifications requires authentication', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });

  it('fetches default preferences and allows updating them', async () => {
    if (skipIfNoDb()) {
      return;
    }

    // Get default preferences
    const getRes = await request(app).get(`${BASE}/preferences`).set('Authorization', tokenA);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.preferences.inApp.connectionRequests).toBe(true);
    expect(getRes.body.data.preferences.email.security).toBe(true);

    // Update preferences: turn off connectionRequests in app
    const updateRes = await request(app)
      .patch(`${BASE}/preferences`)
      .set('Authorization', tokenA)
      .send({
        inApp: {
          connectionRequests: false,
        },
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.preferences.inApp.connectionRequests).toBe(false);
  });

  it('receives notification when eventBus emits connection request event', async () => {
    if (skipIfNoDb()) {
      return;
    }

    // Trigger connection request sent event
    eventBus.publish(APP_EVENT.CONNECTION_REQUEST_SENT, {
      relationshipId: '60c72b2f9b1d8b2bad000099',
      fromUserId: userA._id.toString(),
      toUserId: userB._id.toString(),
      timestamp: new Date(),
    });

    // Wait a tick for async event processing
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Check Bob's notifications
    const res = await request(app).get(BASE).set('Authorization', tokenB);
    expect(res.status).toBe(200);
    expect(res.body.data.notifications).toHaveLength(1);

    const notification = res.body.data.notifications[0];
    expect(notification.type).toBe('CONNECTION_REQUEST');
    expect(notification.actor.username).toBe('alice-notify');
    expect(notification.isRead).toBe(false);

    // Check unread count
    const countRes = await request(app).get(`${BASE}/unread-count`).set('Authorization', tokenB);
    expect(countRes.status).toBe(200);
    expect(countRes.body.data.unreadCount).toBe(1);

    // Bob marks notification as read
    const readRes = await request(app)
      .patch(`${BASE}/${notification.id}/read`)
      .set('Authorization', tokenB);
    expect(readRes.status).toBe(200);
    expect(readRes.body.data.isRead).toBe(true);

    // Unread count is now 0
    const countAfter = await request(app).get(`${BASE}/unread-count`).set('Authorization', tokenB);
    expect(countAfter.body.data.unreadCount).toBe(0);
  });

  it('prevents unauthorized user from marking another user notification as read', async () => {
    if (skipIfNoDb()) {
      return;
    }

    // Create a notification for Bob directly
    const note = await Notification.create({
      recipient: userB._id,
      actor: userA._id,
      type: 'SYSTEM_ANNOUNCEMENT',
      title: 'Alert',
      body: 'Testing alert',
    });

    // Alice tries to mark Bob's notification as read -> 404
    const res = await request(app)
      .patch(`${BASE}/${note._id}/read`)
      .set('Authorization', tokenA);
    expect(res.status).toBe(404);
  });

  it('supports read-all endpoint', async () => {
    if (skipIfNoDb()) {
      return;
    }

    await Notification.create([
      {
        recipient: userB._id,
        actor: userA._id,
        type: 'SYSTEM_ANNOUNCEMENT',
        title: 'Alert 1',
        body: 'Testing 1',
      },
      {
        recipient: userB._id,
        actor: userA._id,
        type: 'SYSTEM_ANNOUNCEMENT',
        title: 'Alert 2',
        body: 'Testing 2',
      },
    ]);

    const countBefore = await request(app).get(`${BASE}/unread-count`).set('Authorization', tokenB);
    expect(countBefore.body.data.unreadCount).toBe(2);

    const markAllRes = await request(app).post(`${BASE}/read-all`).set('Authorization', tokenB);
    expect(markAllRes.status).toBe(200);
    expect(markAllRes.body.data.modifiedCount).toBe(2);

    const countAfter = await request(app).get(`${BASE}/unread-count`).set('Authorization', tokenB);
    expect(countAfter.body.data.unreadCount).toBe(0);
  });

  it('respects user preference by skipping in-app notification when disabled', async () => {
    if (skipIfNoDb()) {
      return;
    }

    // Bob disables profileViews inApp
    await request(app)
      .patch(`${BASE}/preferences`)
      .set('Authorization', tokenB)
      .send({
        inApp: {
          profileViews: false,
        },
      });

    // Alice views Bob's profile event
    eventBus.publish(APP_EVENT.PROFILE_VIEWED, {
      profileUserId: userB._id.toString(),
      profileUsername: 'bob-notify',
      viewerId: userA._id.toString(),
      timestamp: new Date(),
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Bob's notifications should remain 0
    const res = await request(app).get(BASE).set('Authorization', tokenB);
    expect(res.status).toBe(200);
    expect(res.body.data.notifications).toHaveLength(0);
  });
});
