import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../../helpers/db.js';
import { generateAccessToken } from '../../../src/modules/auth/tokenService.js';
import { User } from '../../../src/modules/users/user.model.js';
import { Connection } from '../../../src/modules/connections/connection.model.js';
import { ACCOUNT_STATE } from '../../../src/config/constants.js';

let app;
let mongoose;

const BASE = '/api/v1/conversations';

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

describe('Conversations & Messaging Lifecycle', () => {
  let userA;
  let userB;
  let userUnconnected;
  let tokenA;
  let tokenB;

  beforeEach(async () => {
    if (skipIfNoDb()) {
      return;
    }

    userA = await User.create({
      email: 'alice@onewinq.com',
      passwordHash: 'dummy',
      username: 'alice-chat',
      displayName: 'Alice Chat',
      accountState: ACCOUNT_STATE.ACTIVE,
      emailVerified: true,
    });

    userB = await User.create({
      email: 'bob@onewinq.com',
      passwordHash: 'dummy',
      username: 'bob-chat',
      displayName: 'Bob Chat',
      accountState: ACCOUNT_STATE.ACTIVE,
      emailVerified: true,
    });

    userUnconnected = await User.create({
      email: 'charlie@onewinq.com',
      passwordHash: 'dummy',
      username: 'charlie-chat',
      displayName: 'Charlie Chat',
      accountState: ACCOUNT_STATE.ACTIVE,
      emailVerified: true,
    });

    // Establish connection between userA and userB
    const [uLow, uHigh] = userA._id.toString() < userB._id.toString()
      ? [userA._id, userB._id]
      : [userB._id, userA._id];

    await Connection.create({
      userLow: uLow,
      userHigh: uHigh,
      initiatedBy: userA._id,
      state: 'CONNECTED',
      actionBy: userA._id,
      connectedAt: new Date(),
    });

    tokenA = `Bearer ${generateAccessToken({ userId: userA._id.toString(), sessionId: 'sessA' })}`;
    tokenB = `Bearer ${generateAccessToken({ userId: userB._id.toString(), sessionId: 'sessB' })}`;
  });

  it('rejects starting conversation with unconnected user', async () => {
    if (skipIfNoDb()) {
      return;
    }

    const res = await request(app)
      .post(`${BASE}`)
      .set('Authorization', tokenA)
      .send({ targetUserId: userUnconnected._id.toString() });

    expect(res.status).toBe(403);
  });

  it('allows connected users to initialize a conversation and send messages', async () => {
    if (skipIfNoDb()) {
      return;
    }

    // Start conversation
    const initRes = await request(app)
      .post(`${BASE}`)
      .set('Authorization', tokenA)
      .send({ targetUserId: userB._id.toString() });

    expect(initRes.status).toBe(200);
    const conversationId = initRes.body.data.conversationId;
    expect(conversationId).toBeDefined();

    // Alice sends a message to Bob
    const sendRes = await request(app)
      .post(`${BASE}/${conversationId}/messages`)
      .set('Authorization', tokenA)
      .send({ text: 'Hello Bob!' });

    expect(sendRes.status).toBe(201);
    expect(sendRes.body.data.message.text).toBe('Hello Bob!');
    expect(sendRes.body.data.message.isRead).toBe(false);

    const messageId = sendRes.body.data.message.id;

    // Bob checks messages
    const getRes = await request(app)
      .get(`${BASE}/${conversationId}/messages`)
      .set('Authorization', tokenB);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.messages).toHaveLength(1);
    expect(getRes.body.data.messages[0].id).toBe(messageId);

    // Bob marks conversation as read
    const readRes = await request(app)
      .post(`${BASE}/${conversationId}/read`)
      .set('Authorization', tokenB);

    expect(readRes.status).toBe(200);
    expect(readRes.body.message).toBe('Conversation marked as read.');
  });

  it('allows message editing only by sender', async () => {
    if (skipIfNoDb()) {
      return;
    }

    const initRes = await request(app)
      .post(`${BASE}`)
      .set('Authorization', tokenA)
      .send({ targetUserId: userB._id.toString() });

    const conversationId = initRes.body.data.conversationId;

    const sendRes = await request(app)
      .post(`${BASE}/${conversationId}/messages`)
      .set('Authorization', tokenA)
      .send({ text: 'Original text' });

    const messageId = sendRes.body.data.message.id;

    // Bob attempts to edit Alice's message -> 403
    const badEdit = await request(app)
      .put(`${BASE}/messages/${messageId}`)
      .set('Authorization', tokenB)
      .send({ text: 'Unauthorized edit' });

    expect(badEdit.status).toBe(403);

    // Alice edits her message
    const goodEdit = await request(app)
      .put(`${BASE}/messages/${messageId}`)
      .set('Authorization', tokenA)
      .send({ text: 'Updated text' });

    expect(goodEdit.status).toBe(200);
    expect(goodEdit.body.data.message.text).toBe('Updated text');
    expect(goodEdit.body.data.message.isEdited).toBe(true);
  });

  it('handles delete for everyone and delete for me', async () => {
    if (skipIfNoDb()) {
      return;
    }

    const initRes = await request(app)
      .post(`${BASE}`)
      .set('Authorization', tokenA)
      .send({ targetUserId: userB._id.toString() });

    const conversationId = initRes.body.data.conversationId;

    const sendRes = await request(app)
      .post(`${BASE}/${conversationId}/messages`)
      .set('Authorization', tokenA)
      .send({ text: 'Secret message' });

    const messageId = sendRes.body.data.message.id;

    // Delete for everyone
    const delRes = await request(app)
      .delete(`${BASE}/messages/${messageId}?mode=for-everyone`)
      .set('Authorization', tokenA);

    expect(delRes.status).toBe(200);

    // When Bob reads messages, it shows placeholder
    const bobGet = await request(app)
      .get(`${BASE}/${conversationId}/messages`)
      .set('Authorization', tokenB);

    expect(bobGet.body.data.messages[0].text).toBe('This message was deleted');
    expect(bobGet.body.data.messages[0].isDeletedForEveryone).toBe(true);
  });

  it('supports per-user conversation deletion', async () => {
    if (skipIfNoDb()) {
      return;
    }

    const initRes = await request(app)
      .post(`${BASE}`)
      .set('Authorization', tokenA)
      .send({ targetUserId: userB._id.toString() });

    const conversationId = initRes.body.data.conversationId;

    await request(app)
      .post(`${BASE}/${conversationId}/messages`)
      .set('Authorization', tokenA)
      .send({ text: 'Chat message' });

    // Alice deletes conversation for herself
    const delRes = await request(app)
      .delete(`${BASE}/${conversationId}`)
      .set('Authorization', tokenA);

    expect(delRes.status).toBe(200);

    // Alice's conversation inbox is now empty
    const aliceList = await request(app).get(`${BASE}`).set('Authorization', tokenA);
    expect(aliceList.body.data.conversations).toHaveLength(0);

    // Bob still has the conversation in his inbox
    const bobList = await request(app).get(`${BASE}`).set('Authorization', tokenB);
    expect(bobList.body.data.conversations).toHaveLength(1);
    expect(bobList.body.data.conversations[0].id).toBe(conversationId);
  });
});
