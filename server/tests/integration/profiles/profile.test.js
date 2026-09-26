import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../../helpers/db.js';
import { generateAccessToken } from '../../../src/modules/auth/tokenService.js';
import { User } from '../../../src/modules/users/user.model.js';
import { ACCOUNT_STATE } from '../../../src/config/constants.js';

let app;
let mongoose;

const BASE = '/api/v1/profiles';

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

describe('Profile Endpoints (Authenticated)', () => {
  let testUser;
  let authHeader;

  beforeEach(async () => {
    if (skipIfNoDb()) {return;}

    testUser = await User.create({
      email: 'profiletest@onewinq.com',
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dummyhash',
      username: 'profileuser',
      displayName: 'Profile User',
      accountState: ACCOUNT_STATE.ACTIVE,
      emailVerified: true,
    });

    const token = generateAccessToken({
      userId: testUser._id.toString(),
      sessionId: 'sess_profile_1',
    });
    authHeader = `Bearer ${token}`;
  });

  it('GET /api/v1/profiles/me requires authentication', async () => {
    const res = await request(app).get(`${BASE}/me`);
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/profiles/me returns profile and identities for authenticated user', async () => {
    if (skipIfNoDb()) {return;}

    const res = await request(app).get(`${BASE}/me`).set('Authorization', authHeader);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.profile.userId).toBe(testUser._id.toString());
    expect(Array.isArray(res.body.data.identities)).toBe(true);
  });

  it('PUT /api/v1/profiles/me updates profile draft', async () => {
    if (skipIfNoDb()) {return;}

    const updatePayload = {
      headline: 'Principal Engineer & Tech Lead',
      bio: 'Passionate about distributed architectures.',
      location: { city: 'Berlin', country: 'Germany', isRemote: true },
      experience: [
        {
          company: 'Acme Global',
          role: 'Principal Engineer',
          description: 'Leading platform engineering.',
          startMonth: 3,
          startYear: 2022,
          current: true,
        },
      ],
      education: [
        {
          institution: 'Technical University Berlin',
          degree: 'Master of Science',
          fieldOfStudy: 'Computer Science',
          startMonth: 9,
          startYear: 2017,
          endMonth: 6,
          endYear: 2021,
          current: false,
        },
      ],
      skills: [{ name: 'Node.js' }, { name: 'MongoDB' }],
    };

    const res = await request(app)
      .put(`${BASE}/me`)
      .set('Authorization', authHeader)
      .send(updatePayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.profile.headline).toBe('Principal Engineer & Tech Lead');
    expect(res.body.data.profile.experience).toHaveLength(1);
    expect(res.body.data.profile.experience[0].id).toBeDefined(); // stable ID generated
    expect(res.body.data.profile.experience[0].startMonth).toBe(3);
    expect(res.body.data.profile.experience[0].startYear).toBe(2022);
    expect(res.body.data.profile.experience[0].current).toBe(true);
    expect(res.body.data.profile.education).toHaveLength(1);
    expect(res.body.data.profile.education[0].startMonth).toBe(9);
    expect(res.body.data.profile.education[0].endYear).toBe(2021);
  });

  it('POST /api/v1/profiles/me/publish creates a published snapshot', async () => {
    if (skipIfNoDb()) {return;}

    // Update draft first
    await request(app)
      .put(`${BASE}/me`)
      .set('Authorization', authHeader)
      .send({ headline: 'Published Headline' });

    // Publish
    const res = await request(app).post(`${BASE}/me/publish`).set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.profile.state).toBe('PUBLISHED');
    expect(res.body.data.profile.publishedData).toBeDefined();
    expect(res.body.data.profile.publishedData.headline).toBe('Published Headline');
  });

  it('PUT /api/v1/profiles/me/visibility updates section and field visibility maps', async () => {
    if (skipIfNoDb()) {return;}

    const res = await request(app)
      .put(`${BASE}/me/visibility`)
      .set('Authorization', authHeader)
      .send({
        avatarVisibility: 'PRIVATE',
        sectionVisibility: { experience: 'PROFESSIONAL' },
        fieldVisibility: { 'contact.phone': 'PRIVATE' },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.profile.avatarVisibility).toBe('PRIVATE');
  });

  it('POST /api/v1/profiles/me/mode switches presentation mode and clears temporary mode', async () => {
    if (skipIfNoDb()) {return;}

    const res = await request(app)
      .post(`${BASE}/me/mode`)
      .set('Authorization', authHeader)
      .send({ mode: 'PROFESSIONAL' });

    expect(res.status).toBe(200);
    expect(res.body.data.profile.activeMode).toBe('PROFESSIONAL');
  });

  it('POST /api/v1/profiles/me/mode/temporary sets a time-bound override', async () => {
    if (skipIfNoDb()) {return;}

    const res = await request(app)
      .post(`${BASE}/me/mode/temporary`)
      .set('Authorization', authHeader)
      .send({ mode: 'PRIVATE', durationHours: 6, fallbackMode: 'PUBLIC' });

    expect(res.status).toBe(200);
    expect(res.body.data.profile.temporaryMode.mode).toBe('PRIVATE');
    expect(res.body.data.profile.temporaryMode.expiresAt).toBeDefined();
  });

  it('DELETE /api/v1/profiles/me/mode/temporary cancels temporary override', async () => {
    if (skipIfNoDb()) {return;}

    await request(app)
      .post(`${BASE}/me/mode/temporary`)
      .set('Authorization', authHeader)
      .send({ mode: 'PRIVATE', durationHours: 1 });

    const res = await request(app)
      .delete(`${BASE}/me/mode/temporary`)
      .set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data.profile.temporaryMode.mode).toBeNull();
  });

  it('GET /api/v1/profiles/me/preview returns filtered draft view', async () => {
    if (skipIfNoDb()) {return;}

    await request(app)
      .put(`${BASE}/me`)
      .set('Authorization', authHeader)
      .send({ headline: 'Preview Tester' });

    const res = await request(app)
      .get(`${BASE}/me/preview?mode=PUBLIC`)
      .set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data.preview.headline).toBe('Preview Tester');
  });

  it('creates and manages professional identities', async () => {
    if (skipIfNoDb()) {return;}

    // Create identity
    const createRes = await request(app)
      .post(`${BASE}/me/identities`)
      .set('Authorization', authHeader)
      .send({ customTitle: 'Software Architect', isPrimary: true });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.identity.customTitle).toBe('Software Architect');
    expect(createRes.body.data.identity.isPrimary).toBe(true);

    const identityId = createRes.body.data.identity.id;

    // List identities
    const listRes = await request(app).get(`${BASE}/me/identities`).set('Authorization', authHeader);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.identities).toHaveLength(1);

    // Delete identity
    const delRes = await request(app)
      .delete(`${BASE}/me/identities/${identityId}`)
      .set('Authorization', authHeader);
    expect(delRes.status).toBe(200);
  });

  it('POST /api/v1/profiles/me/username validates format and reserves old username in history', async () => {
    if (skipIfNoDb()) {return;}

    // Invalid format (underscore not allowed)
    const badRes = await request(app)
      .post(`${BASE}/me/username`)
      .set('Authorization', authHeader)
      .send({ username: 'invalid_name' });
    expect(badRes.status).toBe(400);

    // Reserved username
    const resRes = await request(app)
      .post(`${BASE}/me/username`)
      .set('Authorization', authHeader)
      .send({ username: 'admin' });
    expect(resRes.status).toBe(409);

    // Valid username change
    const goodRes = await request(app)
      .post(`${BASE}/me/username`)
      .set('Authorization', authHeader)
      .send({ username: 'new-profile-handle' });

    expect(goodRes.status).toBe(200);
    expect(goodRes.body.data.username).toBe('new-profile-handle');
    expect(goodRes.body.data.oldUsername).toBe('profileuser');

    // Trying to change again immediately hits 30-day cooldown
    const cooldownRes = await request(app)
      .post(`${BASE}/me/username`)
      .set('Authorization', authHeader)
      .send({ username: 'another-handle' });
    expect(cooldownRes.status).toBe(429);
  });
});
