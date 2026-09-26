import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../../helpers/db.js';
import { generateAccessToken } from '../../../src/modules/auth/tokenService.js';
import { User } from '../../../src/modules/users/user.model.js';
import { ACCOUNT_STATE } from '../../../src/config/constants.js';

let app;
let mongoose;

const BASE = '/api/v1/posts';

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

describe('Community Posts & Social Feed Endpoints', () => {
  let user1;
  let user2;
  let authHeader1;
  let authHeader2;

  beforeEach(async () => {
    if (skipIfNoDb()) return;

    user1 = await User.create({
      email: 'postuser1@onewinq.com',
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dummyhash',
      username: 'postauthor',
      displayName: 'Post Author',
      accountState: ACCOUNT_STATE.ACTIVE,
      emailVerified: true,
    });

    user2 = await User.create({
      email: 'postuser2@onewinq.com',
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dummyhash',
      username: 'postreader',
      displayName: 'Post Reader',
      accountState: ACCOUNT_STATE.ACTIVE,
      emailVerified: true,
    });

    const token1 = generateAccessToken({ userId: user1._id.toString(), sessionId: 'sess_post_1' });
    authHeader1 = `Bearer ${token1}`;

    const token2 = generateAccessToken({ userId: user2._id.toString(), sessionId: 'sess_post_2' });
    authHeader2 = `Bearer ${token2}`;
  });

  it('POST /api/v1/posts requires authentication', async () => {
    const res = await request(app).post(BASE).send({ content: 'Unauthenticated post' });
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/posts creates a post and returns 201', async () => {
    if (skipIfNoDb()) return;

    const res = await request(app)
      .post(BASE)
      .set('Authorization', authHeader1)
      .send({
        content: 'Hello OneWinq network! Check out our new platform.',
        media: [
          {
            type: 'IMAGE',
            url: 'https://example.com/demo.png',
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.post).toBeDefined();
    expect(res.body.data.post.content).toBe('Hello OneWinq network! Check out our new platform.');
    expect(res.body.data.post.media).toHaveLength(1);
    expect(res.body.data.post.author.username).toBe('postauthor');
  });

  it('GET /api/v1/posts retrieves feed with post counts and enrichment', async () => {
    if (skipIfNoDb()) return;

    // Create post
    await request(app)
      .post(BASE)
      .set('Authorization', authHeader1)
      .send({ content: 'First community update' });

    const feedRes = await request(app).get(BASE).set('Authorization', authHeader2);
    expect(feedRes.status).toBe(200);
    expect(feedRes.body.data.posts).toHaveLength(1);
    expect(feedRes.body.data.posts[0].content).toBe('First community update');
    expect(feedRes.body.data.posts[0].isLiked).toBe(false);
    expect(feedRes.body.data.posts[0].isSaved).toBe(false);
  });

  it('POST /api/v1/posts/:id/like toggles likes atomically', async () => {
    if (skipIfNoDb()) return;

    const createRes = await request(app)
      .post(BASE)
      .set('Authorization', authHeader1)
      .send({ content: 'Like this post!' });

    const postId = createRes.body.data.post._id;

    // Like
    const likeRes = await request(app)
      .post(`${BASE}/${postId}/like`)
      .set('Authorization', authHeader2);
    expect(likeRes.status).toBe(200);
    expect(likeRes.body.data.isLiked).toBe(true);
    expect(likeRes.body.data.likesCount).toBe(1);

    // Unlike
    const unlikeRes = await request(app)
      .post(`${BASE}/${postId}/like`)
      .set('Authorization', authHeader2);
    expect(unlikeRes.status).toBe(200);
    expect(unlikeRes.body.data.isLiked).toBe(false);
    expect(unlikeRes.body.data.likesCount).toBe(0);
  });

  it('POST /api/v1/posts/:id/save toggles bookmark state', async () => {
    if (skipIfNoDb()) return;

    const createRes = await request(app)
      .post(BASE)
      .set('Authorization', authHeader1)
      .send({ content: 'Save this post!' });

    const postId = createRes.body.data.post._id;

    // Save
    const saveRes = await request(app)
      .post(`${BASE}/${postId}/save`)
      .set('Authorization', authHeader2);
    expect(saveRes.status).toBe(200);
    expect(saveRes.body.data.isSaved).toBe(true);
    expect(saveRes.body.data.savesCount).toBe(1);

    // Verify saved feed
    const savedFeed = await request(app)
      .get(`${BASE}?filter=saved`)
      .set('Authorization', authHeader2);
    expect(savedFeed.status).toBe(200);
    expect(savedFeed.body.data.posts).toHaveLength(1);
    expect(savedFeed.body.data.posts[0]._id).toBe(postId);
  });

  it('Supports nested comment threads and replies', async () => {
    if (skipIfNoDb()) return;

    const createRes = await request(app)
      .post(BASE)
      .set('Authorization', authHeader1)
      .send({ content: 'Post with discussions' });

    const postId = createRes.body.data.post._id;

    // Top-level comment by user2
    const commentRes = await request(app)
      .post(`${BASE}/${postId}/comments`)
      .set('Authorization', authHeader2)
      .send({ content: 'Great launch! How did you build it?' });

    expect(commentRes.status).toBe(201);
    const parentCommentId = commentRes.body.data.comment._id;

    // Nested reply by author (user1)
    const replyRes = await request(app)
      .post(`${BASE}/${postId}/comments`)
      .set('Authorization', authHeader1)
      .send({ content: 'Built with React, Express, and MongoDB!', parentId: parentCommentId });

    expect(replyRes.status).toBe(201);

    // Get comments hierarchy
    const listRes = await request(app).get(`${BASE}/${postId}/comments`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.comments).toHaveLength(1); // 1 root comment
    expect(listRes.body.data.comments[0].replies).toHaveLength(1); // 1 nested reply
    expect(listRes.body.data.comments[0].replies[0].content).toBe('Built with React, Express, and MongoDB!');
  });

  it('PATCH /api/v1/posts/:id/archive hides post from feed and shows in archived', async () => {
    if (skipIfNoDb()) return;

    const createRes = await request(app)
      .post(BASE)
      .set('Authorization', authHeader1)
      .send({ content: 'Temporary post' });

    const postId = createRes.body.data.post._id;

    // Archive
    const archiveRes = await request(app)
      .patch(`${BASE}/${postId}/archive`)
      .set('Authorization', authHeader1);
    expect(archiveRes.status).toBe(200);
    expect(archiveRes.body.data.isArchived).toBe(true);

    // Should not be in public feed
    const publicFeed = await request(app).get(BASE);
    expect(publicFeed.body.data.posts).toHaveLength(0);

    // Should appear in author archived filter
    const archivedFeed = await request(app)
      .get(`${BASE}?filter=archived`)
      .set('Authorization', authHeader1);
    expect(archivedFeed.body.data.posts).toHaveLength(1);
    expect(archivedFeed.body.data.posts[0]._id).toBe(postId);
  });

  it('DELETE /api/v1/posts/:id deletes post (owner only)', async () => {
    if (skipIfNoDb()) return;

    const createRes = await request(app)
      .post(BASE)
      .set('Authorization', authHeader1)
      .send({ content: 'Post to delete' });

    const postId = createRes.body.data.post._id;

    // User2 cannot delete user1's post
    const forbiddenRes = await request(app)
      .delete(`${BASE}/${postId}`)
      .set('Authorization', authHeader2);
    expect(forbiddenRes.status).toBe(403);

    // User1 deletes own post
    const deleteRes = await request(app)
      .delete(`${BASE}/${postId}`)
      .set('Authorization', authHeader1);
    expect(deleteRes.status).toBe(200);

    // Post no longer returned
    const getRes = await request(app).get(`${BASE}/${postId}`);
    expect(getRes.status).toBe(404);
  });
});
