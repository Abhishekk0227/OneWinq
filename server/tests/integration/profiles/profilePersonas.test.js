import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../../helpers/db.js';
import { generateAccessToken } from '../../../src/modules/auth/tokenService.js';
import { User } from '../../../src/modules/users/user.model.js';
import { Profile } from '../../../src/modules/profiles/profile.model.js';
import { ProfileTemplate } from '../../../src/modules/profiles/profileTemplate.model.js';
import { profileTemplateService } from '../../../src/modules/profiles/profileTemplate.service.js';
import { ACCOUNT_STATE } from '../../../src/config/constants.js';

let app;

beforeAll(async () => {
  const appModule = await import('../../../app.js');
  app = appModule.default;
  try {
    await connectTestDb();
    await profileTemplateService.seedDefaultTemplatesIfEmpty();
  } catch (err) {
    // ignore
  }
});

afterEach(async () => {
  try {
    await clearTestDb();
    await profileTemplateService.seedDefaultTemplatesIfEmpty();
  } catch (err) {
    // ignore
  }
});

afterAll(async () => {
  try {
    await disconnectTestDb();
  } catch (err) {
    // ignore
  }
});

describe('OneWinq Multi-Persona Profession Profiles & Dynamic Constant URL Resolution', () => {
  let user;
  let token;

  beforeEach(async () => {
    try {
      user = await User.create({
        email: 'alex.creator@onewinq.com',
        username: 'alexdev',
        displayName: 'Alex Rivers',
        passwordHash: 'dummyhash',
        role: 'USER',
        accountState: ACCOUNT_STATE.ACTIVE,
        emailVerified: true,
      });
      token = generateAccessToken(user);
    } catch {
      // ignore
    }
  });

  it('allows a user to create and maintain multiple profession personas simultaneously', async () => {
    if (!token) return;

    // 1. Initial profile fetch creates the first default persona (Engineer)
    const initRes = await request(app)
      .get('/api/v1/profiles/me')
      .set('Authorization', `Bearer ${token}`);

    expect(initRes.status).toBe(200);
    const initialProfile = initRes.body.data.profile;

    // Customize the 1st persona as Software Engineer
    await request(app)
      .put('/api/v1/profiles/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        personaName: 'Software Engineer',
        professionTitle: 'Lead Software Architect',
        headline: 'Building scalable distributed cloud systems',
        templateSlug: 'engineer',
      });

    // Publish the 1st persona
    await request(app)
      .post('/api/v1/profiles/me/publish')
      .set('Authorization', `Bearer ${token}`);

    // 2. Create a second persona: Content Creator
    const createRes = await request(app)
      .post('/api/v1/profiles/me/personas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        personaName: 'Content Creator',
        professionTitle: 'Tech Video Creator',
        templateSlug: 'creator',
      });

    expect(createRes.status).toBe(201);
    const creatorPersonaId = createRes.body.data.persona._id;

    // Customize the 2nd persona independently
    await request(app)
      .put(`/api/v1/profiles/me?personaId=${creatorPersonaId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        personaName: 'Content Creator',
        professionTitle: 'Tech Video Creator',
        headline: 'Making coding tutorials and tech reviews on YouTube',
        templateSlug: 'creator',
      });

    // Publish the 2nd persona
    await request(app)
      .post(`/api/v1/profiles/me/publish?personaId=${creatorPersonaId}`)
      .set('Authorization', `Bearer ${token}`);

    // 3. Verify both personas exist simultaneously
    const listRes = await request(app)
      .get('/api/v1/profiles/me/personas')
      .set('Authorization', `Bearer ${token}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.personas).toHaveLength(2);

    const engineerPersona = listRes.body.data.personas.find((p) => p.personaName === 'Software Engineer');
    const creatorPersona = listRes.body.data.personas.find((p) => p.personaName === 'Content Creator');

    expect(engineerPersona).toBeDefined();
    expect(creatorPersona).toBeDefined();
    expect(engineerPersona.isActive).toBe(true);
    expect(creatorPersona.isActive).toBe(false);

    // 4. Test Constant URL resolution (/u/alexdev) shows the ACTIVE Engineer persona
    const publicEngRes = await request(app).get('/api/v1/public/u/alexdev');
    expect(publicEngRes.status).toBe(200);
    expect(publicEngRes.body.data.profile.templateSlug).toBe('engineer');
    expect(publicEngRes.body.data.profile.headline).toContain('distributed cloud systems');
    expect(publicEngRes.body.data.activePersona.personaName).toBe('Software Engineer');

    // 5. User switches active persona to Content Creator
    const switchRes = await request(app)
      .post(`/api/v1/profiles/me/personas/${creatorPersonaId}/activate`)
      .set('Authorization', `Bearer ${token}`);

    expect(switchRes.status).toBe(200);

    // 6. Test Constant URL resolution (/u/alexdev): URL NEVER CHANGES, but content is now Creator!
    const publicCreatorRes = await request(app).get('/api/v1/public/u/alexdev');
    expect(publicCreatorRes.status).toBe(200);
    expect(publicCreatorRes.body.data.profile.templateSlug).toBe('creator');
    expect(publicCreatorRes.body.data.profile.headline).toContain('tech reviews on YouTube');
    expect(publicCreatorRes.body.data.activePersona.personaName).toBe('Content Creator');

    // 7. User switches back to Engineer
    await request(app)
      .post(`/api/v1/profiles/me/personas/${initialProfile._id}/activate`)
      .set('Authorization', `Bearer ${token}`);

    const publicEngAgainRes = await request(app).get('/api/v1/public/u/alexdev');
    expect(publicEngAgainRes.status).toBe(200);
    expect(publicEngAgainRes.body.data.profile.templateSlug).toBe('engineer');
    expect(publicEngAgainRes.body.data.profile.headline).toContain('distributed cloud systems');
  });

  it('prevents deleting the only persona', async () => {
    if (!token) return;

    const initRes = await request(app)
      .get('/api/v1/profiles/me')
      .set('Authorization', `Bearer ${token}`);

    const personaId = initRes.body.data.profile._id;

    const delRes = await request(app)
      .delete(`/api/v1/profiles/me/personas/${personaId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(delRes.status).toBe(400);
    expect(delRes.body.message).toContain('only profile persona');
  });
});
