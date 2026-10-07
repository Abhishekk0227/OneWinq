import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../../helpers/db.js';
import { User } from '../../../src/modules/users/user.model.js';
import { Profile } from '../../../src/modules/profiles/profile.model.js';
import { Card } from '../../../src/modules/cards/card.model.js';
import { UsernameHistory } from '../../../src/modules/profiles/usernameHistory.model.js';
import { ProfessionalIdentity } from '../../../src/modules/profiles/professionalIdentity.model.js';
import { ACCOUNT_STATE, PROFILE_STATE, CARD_STATE, VISIBILITY_MODE, SECTION_VISIBILITY } from '../../../src/config/constants.js';

let app;
let mongoose;

const BASE = '/api/v1/public/u';

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

describe('Public Profile Resolver — GET /api/v1/public/u/:username', () => {
  it('returns 404 for non-existent username', async () => {
    if (skipIfNoDb()) {return;}

    const res = await request(app).get(`${BASE}/nobody-here`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 for user whose profile is still in DRAFT (anti-enumeration)', async () => {
    if (skipIfNoDb()) {return;}

    const user = await User.create({
      email: 'draft@onewinq.com',
      passwordHash: 'dummy',
      username: 'draftuser',
      displayName: 'Draft User',
      accountState: ACCOUNT_STATE.ACTIVE,
      emailVerified: true,
    });

    await Profile.create({
      userId: user._id,
      state: PROFILE_STATE.DRAFT,
      headline: 'Work in progress',
    });

    const res = await request(app).get(`${BASE}/draftuser`);
    expect(res.status).toBe(404);
  });

  it('returns 404 for suspended/deactivated accounts without leaking account state', async () => {
    if (skipIfNoDb()) {return;}

    const suspendedUser = await User.create({
      email: 'suspended@onewinq.com',
      passwordHash: 'dummy',
      username: 'suspendeduser',
      displayName: 'Suspended User',
      accountState: ACCOUNT_STATE.SUSPENDED,
      emailVerified: true,
    });

    await Profile.create({
      userId: suspendedUser._id,
      state: PROFILE_STATE.PUBLISHED,
      publishedData: { headline: 'Will not show' },
    });

    const res = await request(app).get(`${BASE}/suspendeduser`);
    expect(res.status).toBe(404);
  });

  it('returns digital profile (hasActiveCard: false, cardStatus: DIGITAL) when user has not activated a physical card', async () => {
    if (skipIfNoDb()) {return;}

    const user = await User.create({
      email: 'nocard@onewinq.com',
      passwordHash: 'dummy',
      username: 'nocarduser',
      displayName: 'No Card User',
      accountState: ACCOUNT_STATE.ACTIVE,
      emailVerified: true,
    });

    await Profile.create({
      userId: user._id,
      state: PROFILE_STATE.PUBLISHED,
      publishedData: { headline: 'Digital Profile Active' },
      publishedAt: new Date(),
    });

    const res = await request(app).get(`${BASE}/nocarduser`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isCardGated).toBe(false);
    expect(res.body.data.hasActiveCard).toBe(false);
    expect(res.body.data.cardStatus).toBe('DIGITAL');
    expect(res.body.data.profile).toBeDefined();
    expect(res.body.data.profile.headline).toBe('Digital Profile Active');
    expect(res.body.data.user.username).toBe('nocarduser');
    expect(res.body.data.user.displayName).toBe('No Card User');
  });

  it('returns filtered public profile for active, published user with active card', async () => {
    if (skipIfNoDb()) {return;}

    const user = await User.create({
      email: 'active@onewinq.com',
      passwordHash: 'dummy',
      username: 'johndoe',
      displayName: 'John Doe',
      accountState: ACCOUNT_STATE.ACTIVE,
      emailVerified: true,
    });

    await Card.create({
      cardCode: 'OWQ-CARD-TEST99',
      cardUid: 'OWQ-UID-TEST99',
      assignedUser: user._id,
      userId: user._id,
      state: CARD_STATE.ACTIVE,
      status: CARD_STATE.ACTIVE,
      activationCode: '123456',
    });

    await ProfessionalIdentity.create({
      userId: user._id,
      customTitle: 'Lead Software Architect',
      isPrimary: true,
    });

    const publishedSnapshot = {
      headline: 'Architecting high-throughput systems',
      bio: 'Lifelong technologist.',
      avatarUrl: 'https://example.com/avatar.jpg',
      avatarVisibility: SECTION_VISIBILITY.PUBLIC,
      activeMode: VISIBILITY_MODE.PUBLIC,
      contact: {
        email: 'public@example.com',
        phone: '+1-555-9999', // Private by default
      },
      experience: [
        {
          company: 'Acme Cloud',
          role: 'Staff Architect',
          description: 'Building microservices and pipelines.',
        },
      ],
      sectionVisibility: {
        about: SECTION_VISIBILITY.PUBLIC,
        contact: SECTION_VISIBILITY.PUBLIC,
        experience: SECTION_VISIBILITY.PUBLIC,
      },
      fieldVisibility: {
        'contact.email': SECTION_VISIBILITY.PUBLIC,
        'contact.phone': SECTION_VISIBILITY.PRIVATE, // must be stripped
      },
    };

    await Profile.create({
      userId: user._id,
      state: PROFILE_STATE.PUBLISHED,
      publishedData: publishedSnapshot,
      publishedAt: new Date(),
    });

    const res = await request(app).get(`${BASE}/johndoe`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isCardGated).toBe(false);
    expect(res.body.data.hasActiveCard).toBe(true);
    expect(res.body.data.activeCard.cardCode).toBe('OWQ-CARD-TEST99');
    expect(res.body.data.user.displayName).toBe('John Doe');
    expect(res.body.data.user.primaryProfession).toBe('Lead Software Architect');
    expect(res.body.data.profile.headline).toBe('Architecting high-throughput systems');
    expect(res.body.data.profile.sections.experience).toHaveLength(1);

    // Private phone field is completely omitted from response
    expect(res.body.data.profile.contact.email).toBe('public@example.com');
    expect(res.body.data.profile.contact.phone).toBeUndefined();
  });

  it('resolves old username to new profile via UsernameHistory with active card', async () => {
    if (skipIfNoDb()) {return;}

    const user = await User.create({
      email: 'history@onewinq.com',
      passwordHash: 'dummy',
      username: 'new-handle',
      displayName: 'History User',
      accountState: ACCOUNT_STATE.ACTIVE,
      emailVerified: true,
    });

    await Card.create({
      cardCode: 'OWQ-CARD-TEST88',
      cardUid: 'OWQ-UID-TEST88',
      assignedUser: user._id,
      userId: user._id,
      state: CARD_STATE.ACTIVE,
      status: CARD_STATE.ACTIVE,
      activationCode: '654321',
    });

    await UsernameHistory.create({
      oldUsername: 'old-handle',
      newUsername: 'new-handle',
      userId: user._id,
    });

    await Profile.create({
      userId: user._id,
      state: PROFILE_STATE.PUBLISHED,
      publishedData: { headline: 'Redirected profile' },
      publishedAt: new Date(),
    });

    // Requesting old URL resolves to the new profile
    const res = await request(app).get(`${BASE}/old-handle`);
    expect(res.status).toBe(200);
    expect(res.body.data.isCardGated).toBe(false);
    expect(res.body.data.user.username).toBe('new-handle');
    expect(res.body.data.profile.headline).toBe('Redirected profile');
  });
});
