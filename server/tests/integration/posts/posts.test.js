import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../../helpers/db.js';
import { generateAccessToken } from '../../../src/modules/auth/tokenService.js';
import { User } from '../../../src/modules/users/user.model.js';
import { Organization } from '../../../src/modules/organizations/organization.model.js';
import { OrganizationMember } from '../../../src/modules/organizations/organizationMember.model.js';
import { OrganizationFollow } from '../../../src/modules/organizations/organizationFollow.model.js';
import { ACCOUNT_STATE, ORGANIZATION_ROLE, ORGANIZATION_MEMBER_STATUS } from '../../../src/config/constants.js';

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

  it('allows organization member to post as organization, appearing in followed feed', async () => {
    if (skipIfNoDb()) return;

    // Create an organization
    const org = await Organization.create({
      name: 'Acme Enterprise',
      slug: 'acme-enterprise',
      ownerId: user1._id,
      industry: 'Software & Technology',
    });

    // Make user1 owner/admin in OrganizationMember
    await OrganizationMember.create({
      organizationId: org._id,
      userId: user1._id,
      role: ORGANIZATION_ROLE.OWNER,
      status: ORGANIZATION_MEMBER_STATUS.ACTIVE,
    });

    // User1 publishes post on behalf of the organization
    const orgPostRes = await request(app)
      .post(BASE)
      .set('Authorization', authHeader1)
      .send({
        content: 'Acme Corp is thrilled to launch our new product line!',
        organizationId: org._id.toString(),
        authorType: 'ORGANIZATION',
      });

    expect(orgPostRes.status).toBe(201);
    expect(orgPostRes.body.data.post).toBeDefined();
    expect(orgPostRes.body.data.post.author.isOrganization).toBe(true);
    expect(orgPostRes.body.data.post.author.displayName).toBe('Acme Enterprise');
    expect(orgPostRes.body.data.post.author.username).toBe('acme-enterprise');
    expect(orgPostRes.body.data.post.organization.name).toBe('Acme Enterprise');

    // User2 has not followed Acme yet -> following feed is empty
    const unFollowedFeedRes = await request(app)
      .get(`${BASE}?filter=following`)
      .set('Authorization', authHeader2);
    expect(unFollowedFeedRes.status).toBe(200);
    expect(unFollowedFeedRes.body.data.posts).toHaveLength(0);

    // User2 follows Acme Enterprise
    await OrganizationFollow.create({
      organizationId: org._id,
      userId: user2._id,
    });

    // User2 checks following feed -> Acme Enterprise post now appears!
    const followedFeedRes = await request(app)
      .get(`${BASE}?filter=following`)
      .set('Authorization', authHeader2);
    expect(followedFeedRes.status).toBe(200);
    expect(followedFeedRes.body.data.posts).toHaveLength(1);
    expect(followedFeedRes.body.data.posts[0].content).toBe('Acme Corp is thrilled to launch our new product line!');
    expect(followedFeedRes.body.data.posts[0].author.displayName).toBe('Acme Enterprise');
    expect(followedFeedRes.body.data.posts[0].isFollowingOrg).toBe(true);

    // Also appears in general discover feed
    const generalFeedRes = await request(app).get(BASE);
    expect(generalFeedRes.status).toBe(200);
    expect(generalFeedRes.body.data.posts.some((p) => p.author.displayName === 'Acme Enterprise')).toBe(true);
  });
});
