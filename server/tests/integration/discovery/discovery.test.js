import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../../helpers/db.js';
import { generateAccessToken } from '../../../src/modules/auth/tokenService.js';
import { User } from '../../../src/modules/users/user.model.js';
import { Profile } from '../../../src/modules/profiles/profile.model.js';
import { ProfessionalIdentity } from '../../../src/modules/profiles/professionalIdentity.model.js';
import { Connection, getCanonicalUserPair } from '../../../src/modules/connections/connection.model.js';
import { ACCOUNT_STATE, PROFILE_STATE } from '../../../src/config/constants.js';

let app;
let mongoose;

const BASE = '/api/v1/discovery';

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

describe('Discovery & Search Endpoints', () => {
  let viewer;
  let engineer;
  let hiddenUser;
  let blockedUser;
  let tokenViewer;

  beforeEach(async () => {
    if (skipIfNoDb()) {
      return;
    }

    viewer = await User.create({
      email: 'viewer@onewinq.com',
      passwordHash: 'dummy',
      username: 'viewer-search',
      displayName: 'Viewer Search',
      accountState: ACCOUNT_STATE.ACTIVE,
      appearInDiscovery: true,
      emailVerified: true,
    });

    engineer = await User.create({
      email: 'engineer@onewinq.com',
      passwordHash: 'dummy',
      username: 'cloud-engineer',
      displayName: 'Alice Cloud',
      accountState: ACCOUNT_STATE.ACTIVE,
      appearInDiscovery: true,
      emailVerified: true,
    });

    hiddenUser = await User.create({
      email: 'hidden@onewinq.com',
      passwordHash: 'dummy',
      username: 'hidden-user',
      displayName: 'Hidden Person',
      accountState: ACCOUNT_STATE.ACTIVE,
      appearInDiscovery: false, // Opted out of discovery
      emailVerified: true,
    });

    blockedUser = await User.create({
      email: 'blocked@onewinq.com',
      passwordHash: 'dummy',
      username: 'blocked-user',
      displayName: 'Blocked Person',
      accountState: ACCOUNT_STATE.ACTIVE,
      appearInDiscovery: true,
      emailVerified: true,
    });

    // Create published profile for engineer
    await Profile.create({
      userId: engineer._id,
      state: PROFILE_STATE.PUBLISHED,
      publishedData: {
        headline: 'Lead Cloud Architect at Scale',
        skills: [{ id: '1', name: 'Kubernetes' }, { id: '2', name: 'Go' }],
        location: { city: 'Munich', country: 'Germany', isRemote: true },
        sectionVisibility: { skills: 'PUBLIC', location: 'PUBLIC' },
      },
      publishedAt: new Date(),
    });

    await ProfessionalIdentity.create({
      userId: engineer._id,
      customTitle: 'Cloud Architect',
      isPrimary: true,
    });

    // Create published profile for hidden user
    await Profile.create({
      userId: hiddenUser._id,
      state: PROFILE_STATE.PUBLISHED,
      publishedData: { headline: 'Secret Engineer' },
      publishedAt: new Date(),
    });

    // Create published profile for blocked user
    await Profile.create({
      userId: blockedUser._id,
      state: PROFILE_STATE.PUBLISHED,
      publishedData: { headline: 'Will be blocked' },
      publishedAt: new Date(),
    });

    // Block relationship: viewer blocks blockedUser
    const pair = getCanonicalUserPair(viewer._id, blockedUser._id);
    await Connection.create({
      userLow: pair.userLow,
      userHigh: pair.userHigh,
      state: 'BLOCKED',
      actionBy: viewer._id,
      blockedAt: new Date(),
    });

    tokenViewer = `Bearer ${generateAccessToken({ userId: viewer._id.toString(), sessionId: 'sessViewer' })}`;
  });

  it('GET /api/v1/discovery/search discovers active published users by text query', async () => {
    if (skipIfNoDb()) {
      return;
    }

    const res = await request(app)
      .get(`${BASE}/search?q=Alice`)
      .set('Authorization', tokenViewer);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.results.length).toBeGreaterThan(0);
    expect(res.body.data.results[0].username).toBe('cloud-engineer');
    expect(res.body.data.results[0].primaryProfession).toBe('Cloud Architect');
    expect(res.body.data.results[0].topSkills).toContain('Kubernetes');
  });

  it('excludes users who have disabled appearInDiscovery', async () => {
    if (skipIfNoDb()) {
      return;
    }

    const res = await request(app)
      .get(`${BASE}/search?q=Hidden`)
      .set('Authorization', tokenViewer);

    expect(res.status).toBe(200);
    expect(res.body.data.results).toHaveLength(0);
  });

  it('excludes mutually blocked users from search results', async () => {
    if (skipIfNoDb()) {
      return;
    }

    const res = await request(app)
      .get(`${BASE}/search?q=Blocked`)
      .set('Authorization', tokenViewer);

    expect(res.status).toBe(200);
    expect(res.body.data.results).toHaveLength(0);
  });

  it('excludes requesting user from their own discovery results', async () => {
    if (skipIfNoDb()) {
      return;
    }

    const res = await request(app)
      .get(`${BASE}/search?q=Viewer`)
      .set('Authorization', tokenViewer);

    expect(res.status).toBe(200);
    expect(res.body.data.results).toHaveLength(0);
  });
});
