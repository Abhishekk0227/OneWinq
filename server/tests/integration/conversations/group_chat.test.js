import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../../helpers/db.js';
import { generateAccessToken } from '../../../src/modules/auth/tokenService.js';
import { User } from '../../../src/modules/users/user.model.js';
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

describe('Group Chat Lifecycle & Admin Roles', () => {
  let userCreator, userMember1, userMember2, userMember3;
  let tokenCreator, tokenMember1, tokenMember2, tokenMember3;

  beforeEach(async () => {
    if (skipIfNoDb()) return;

    userCreator = await User.create({
      email: 'creator@test.com',
      passwordHash: 'dummy',
      username: 'creator_u',
      displayName: 'Creator User',
      accountState: ACCOUNT_STATE.ACTIVE,
      emailVerified: true,
    });

    userMember1 = await User.create({
      email: 'member1@test.com',
      passwordHash: 'dummy',
      username: 'member1_u',
      displayName: 'Member One',
      accountState: ACCOUNT_STATE.ACTIVE,
      emailVerified: true,
    });

    userMember2 = await User.create({
      email: 'member2@test.com',
      passwordHash: 'dummy',
      username: 'member2_u',
      displayName: 'Member Two',
      accountState: ACCOUNT_STATE.ACTIVE,
      emailVerified: true,
    });

    userMember3 = await User.create({
      email: 'member3@test.com',
      passwordHash: 'dummy',
      username: 'member3_u',
      displayName: 'Member Three',
      accountState: ACCOUNT_STATE.ACTIVE,
      emailVerified: true,
    });

    tokenCreator = generateAccessToken(userCreator._id.toString());
    tokenMember1 = generateAccessToken(userMember1._id.toString());
    tokenMember2 = generateAccessToken(userMember2._id.toString());
    tokenMember3 = generateAccessToken(userMember3._id.toString());
  });

  it('allows a user to create a group chat and become admin/creator', async () => {
    if (skipIfNoDb()) return;

    const res = await request(app)
      .post(`${BASE}/groups`)
      .set('Authorization', `Bearer ${tokenCreator}`)
      .send({
        title: 'Project Alpha Team',
        description: 'Discussion on Alpha project',
        memberUserIds: [userMember1._id.toString()],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.conversation.title).toBe('Project Alpha Team');
    expect(res.body.data.conversation.currentUserRole).toBe('CREATOR');
    expect(res.body.data.conversation.isAdmin).toBe(true);
    expect(res.body.data.conversation.isCreator).toBe(true);
    expect(res.body.data.conversation.memberCount).toBe(2);
  });

  it('allows admin to appoint another member as admin', async () => {
    if (skipIfNoDb()) return;

    // Create group with Member 1 & Member 2
    const createRes = await request(app)
      .post(`${BASE}/groups`)
      .set('Authorization', `Bearer ${tokenCreator}`)
      .send({
        title: 'Tech Squad',
        memberUserIds: [userMember1._id.toString(), userMember2._id.toString()],
      });

    const groupId = createRes.body.data.conversation.id;

    // Appoint Member 1 to ADMIN
    const appointRes = await request(app)
      .put(`${BASE}/${groupId}/admins`)
      .set('Authorization', `Bearer ${tokenCreator}`)
      .send({
        targetUserId: userMember1._id.toString(),
        role: 'ADMIN',
      });

    expect(appointRes.status).toBe(200);
    const m1 = appointRes.body.data.members.find((m) => m.id === userMember1._id.toString());
    expect(m1.role).toBe('ADMIN');
    expect(m1.isAdmin).toBe(true);

    // Verify Member 1 can now add Member 3
    const addRes = await request(app)
      .post(`${BASE}/${groupId}/members`)
      .set('Authorization', `Bearer ${tokenMember1}`)
      .send({
        memberUserIds: [userMember3._id.toString()],
      });

    expect(addRes.status).toBe(200);
    expect(addRes.body.data.memberCount).toBe(4);
  });

  it('prevents regular members from adding or removing users', async () => {
    if (skipIfNoDb()) return;

    const createRes = await request(app)
      .post(`${BASE}/groups`)
      .set('Authorization', `Bearer ${tokenCreator}`)
      .send({
        title: 'Restricted Group',
        memberUserIds: [userMember1._id.toString(), userMember2._id.toString()],
      });

    const groupId = createRes.body.data.conversation.id;

    // Member 1 (regular member) tries to add Member 3 -> 403 Forbidden
    const addRes = await request(app)
      .post(`${BASE}/${groupId}/members`)
      .set('Authorization', `Bearer ${tokenMember1}`)
      .send({
        memberUserIds: [userMember3._id.toString()],
      });

    expect(addRes.status).toBe(403);

    // Member 1 tries to remove Member 2 -> 403 Forbidden
    const removeRes = await request(app)
      .delete(`${BASE}/${groupId}/members/${userMember2._id.toString()}`)
      .set('Authorization', `Bearer ${tokenMember1}`);

    expect(removeRes.status).toBe(403);
  });

  it('allows admin to remove a member, but prevents removing the creator', async () => {
    if (skipIfNoDb()) return;

    const createRes = await request(app)
      .post(`${BASE}/groups`)
      .set('Authorization', `Bearer ${tokenCreator}`)
      .send({
        title: 'Team Gamma',
        memberUserIds: [userMember1._id.toString(), userMember2._id.toString()],
      });

    const groupId = createRes.body.data.conversation.id;

    // Promote Member 1 to ADMIN
    await request(app)
      .put(`${BASE}/${groupId}/admins`)
      .set('Authorization', `Bearer ${tokenCreator}`)
      .send({
        targetUserId: userMember1._id.toString(),
        role: 'ADMIN',
      });

    // Admin Member 1 tries to remove Creator -> 403 Forbidden
    const removeCreatorRes = await request(app)
      .delete(`${BASE}/${groupId}/members/${userCreator._id.toString()}`)
      .set('Authorization', `Bearer ${tokenMember1}`);

    expect(removeCreatorRes.status).toBe(403);

    // Admin Member 1 removes Member 2 -> Success
    const removeMemberRes = await request(app)
      .delete(`${BASE}/${groupId}/members/${userMember2._id.toString()}`)
      .set('Authorization', `Bearer ${tokenMember1}`);

    expect(removeMemberRes.status).toBe(200);
    expect(removeMemberRes.body.data.members.some((m) => m.id === userMember2._id.toString())).toBe(false);
  });

  it('allows members to send messages and get conversation messages in group', async () => {
    if (skipIfNoDb()) return;

    const createRes = await request(app)
      .post(`${BASE}/groups`)
      .set('Authorization', `Bearer ${tokenCreator}`)
      .send({
        title: 'General Chat',
        memberUserIds: [userMember1._id.toString()],
      });

    const groupId = createRes.body.data.conversation.id;

    // Member 1 sends a message
    const msgRes = await request(app)
      .post(`${BASE}/${groupId}/messages`)
      .set('Authorization', `Bearer ${tokenMember1}`)
      .send({
        text: 'Hello everyone!',
      });

    expect(msgRes.status).toBe(201);
    expect(msgRes.body.data.message.text).toBe('Hello everyone!');
    expect(msgRes.body.data.message.sender.displayName).toBe('Member One');

    // Creator retrieves messages
    const getRes = await request(app)
      .get(`${BASE}/${groupId}/messages`)
      .set('Authorization', `Bearer ${tokenCreator}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.messages.length).toBeGreaterThanOrEqual(1);
    const sentMsg = getRes.body.data.messages.find((m) => m.text === 'Hello everyone!');
    expect(sentMsg).toBeDefined();
    expect(sentMsg.sender.displayName).toBe('Member One');
  });
});
