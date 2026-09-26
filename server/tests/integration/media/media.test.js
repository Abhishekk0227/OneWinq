import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../../helpers/db.js';
import { generateAccessToken } from '../../../src/modules/auth/tokenService.js';
import { User } from '../../../src/modules/users/user.model.js';
import { Media } from '../../../src/modules/media/media.model.js';
import { ACCOUNT_STATE } from '../../../src/config/constants.js';
import logger from '../../../src/utils/logger.js';

let app;
let mongoose;

const BASE = '/api/v1/media';

beforeAll(async () => {
  const appModule = await import('../../../app.js');
  app = appModule.default;

  try {
    mongoose = await connectTestDb();
  } catch (err) {
    logger.warn('Failed to connect test db in media.test.js', { error: err.message });
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

describe('Media Uploads & Storage Lifecycle', () => {
  let userA;
  let userB;
  let tokenA;
  let tokenB;

  beforeEach(async () => {
    if (skipIfNoDb()) {
      return;
    }

    userA = await User.create({
      email: 'media.a@onewinq.com',
      passwordHash: 'dummy',
      username: 'media-user-a',
      displayName: 'Media User A',
      accountState: ACCOUNT_STATE.ACTIVE,
      emailVerified: true,
    });

    userB = await User.create({
      email: 'media.b@onewinq.com',
      passwordHash: 'dummy',
      username: 'media-user-b',
      displayName: 'Media User B',
      accountState: ACCOUNT_STATE.ACTIVE,
      emailVerified: true,
    });

    tokenA = `Bearer ${generateAccessToken({ userId: userA._id.toString(), sessionId: 'sessA' })}`;
    tokenB = `Bearer ${generateAccessToken({ userId: userB._id.toString(), sessionId: 'sessB' })}`;
  });

  it('POST /api/v1/media/upload-url requires authentication', async () => {
    const res = await request(app).post(`${BASE}/upload-url`).send({
      purpose: 'PROFILE_PHOTO',
      filename: 'photo.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 50000,
    });

    expect(res.status).toBe(401);
  });

  it('initiates upload and generates presigned upload URL and media record', async () => {
    if (skipIfNoDb()) {
      return;
    }

    const payload = {
      purpose: 'PROFILE_PHOTO',
      filename: 'my_avatar.png',
      mimeType: 'image/png',
      sizeBytes: 150000,
    };

    const res = await request(app)
      .post(`${BASE}/upload-url`)
      .set('Authorization', tokenA)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.data.mediaId).toBeDefined();
    expect(res.body.data.uploadUrl).toBeDefined();
    expect(res.body.data.publicUrl).toBeDefined();
    expect(res.body.data.storageKey).toMatch(/^uploads\/profile_photo\//);

    const mediaId = res.body.data.mediaId;

    // Verify record in database
    const inDb = await Media.findById(mediaId);
    expect(inDb).toBeDefined();
    expect(inDb.state).toBe('PENDING_UPLOAD');
    expect(inDb.uploader.toString()).toBe(userA._id.toString());
  });

  it('confirms media upload successfully', async () => {
    if (skipIfNoDb()) {
      return;
    }

    const initRes = await request(app)
      .post(`${BASE}/upload-url`)
      .set('Authorization', tokenA)
      .send({
        purpose: 'PROFILE_COVER',
        filename: 'banner.webp',
        mimeType: 'image/webp',
        sizeBytes: 450000,
      });

    const mediaId = initRes.body.data.mediaId;
    const storageKey = initRes.body.data.storageKey;

    // Simulate direct PUT upload (mimicking browser fetch to presigned URL)
    const uploadRes = await request(app)
      .put(`${BASE}/upload-local?key=${encodeURIComponent(storageKey)}`)
      .set('Content-Type', 'image/webp')
      .send(Buffer.from('fake-image-binary-data'));

    expect(uploadRes.status).toBe(200);

    // Confirm upload via /:id/confirm
    const confirmRes = await request(app)
      .post(`${BASE}/${mediaId}/confirm`)
      .set('Authorization', tokenA);

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.state).toBe('UPLOADED');

    // Confirm also works via /confirm with body { mediaId }
    const confirmRes2 = await request(app)
      .post(`${BASE}/confirm`)
      .set('Authorization', tokenA)
      .send({ mediaId });

    expect(confirmRes2.status).toBe(200);

    // Check media status via GET
    const getRes = await request(app)
      .get(`${BASE}/${mediaId}`)
      .set('Authorization', tokenA);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.media.state).toBe('UPLOADED');

    // Verify static serving has Cross-Origin-Resource-Policy header
    const staticRes = await request(app).get(`/uploads/${getRes.body.data.media.publicUrl.split('/uploads/')[1]}`);
    expect(staticRes.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });

  it('prevents user B from confirming or deleting user A media', async () => {
    if (skipIfNoDb()) {
      return;
    }

    const initRes = await request(app)
      .post(`${BASE}/upload-url`)
      .set('Authorization', tokenA)
      .send({
        purpose: 'PROFILE_PHOTO',
        filename: 'secret.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 10000,
      });

    const mediaId = initRes.body.data.mediaId;

    // User B tries to confirm User A's media -> 404
    const badConfirm = await request(app)
      .post(`${BASE}/${mediaId}/confirm`)
      .set('Authorization', tokenB);
    expect(badConfirm.status).toBe(404);

    // User B tries to delete User A's media -> 404
    const badDelete = await request(app)
      .delete(`${BASE}/${mediaId}`)
      .set('Authorization', tokenB);
    expect(badDelete.status).toBe(404);

    // User A can successfully delete their media
    const goodDelete = await request(app)
      .delete(`${BASE}/${mediaId}`)
      .set('Authorization', tokenA);
    expect(goodDelete.status).toBe(200);
    expect(goodDelete.body.data.state).toBe('DELETED');
  });
});
