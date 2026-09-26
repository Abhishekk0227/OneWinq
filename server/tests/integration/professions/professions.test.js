import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../../helpers/db.js';
import { generateAccessToken } from '../../../src/modules/auth/tokenService.js';

let app;
let mongoose;

const BASE = '/api/v1/professions';

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

describe('Professions Endpoints', () => {
  it('GET /api/v1/professions/categories seeds and returns industry categories', async () => {
    if (skipIfNoDb()) {return;}

    const res = await request(app).get(`${BASE}/categories`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.categories)).toBe(true);
    expect(res.body.data.categories.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/professions searches and lists official professions', async () => {
    if (skipIfNoDb()) {return;}

    // Seed first
    await request(app).get(`${BASE}/categories`);

    const res = await request(app).get(`${BASE}?query=Engineer`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.professions)).toBe(true);
    expect(res.body.data.professions.some((p) => p.name.includes('Engineer'))).toBe(true);
  });

  it('GET /api/v1/professions filters by category slug without error', async () => {
    if (skipIfNoDb()) return;

    // Seed first
    await request(app).get(`${BASE}/categories`);

    const res = await request(app).get(`${BASE}?query=&category=technology-software&limit=100`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.professions)).toBe(true);
    expect(res.body.data.professions.length).toBeGreaterThan(0);

    const resAll = await request(app).get(`${BASE}?query=&limit=100`);
    expect(resAll.status).toBe(200);
    expect(resAll.body.success).toBe(true);
    expect(Array.isArray(resAll.body.data.professions)).toBe(true);
    expect(resAll.body.data.professions.length).toBeGreaterThan(0);
  });

  it('POST /api/v1/professions/custom requires authentication', async () => {
    const res = await request(app).post(`${BASE}/custom`).send({ name: 'Robotics Specialist' });
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/professions/custom creates custom unverified profession when authenticated', async () => {
    if (skipIfNoDb()) {return;}

    const token = generateAccessToken({ userId: '507f1f77bcf86cd799439011', sessionId: 'sess123' });
    const res = await request(app)
      .post(`${BASE}/custom`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Robotics Specialist' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.profession.name).toBe('Robotics Specialist');
    expect(res.body.data.profession.isOfficial).toBe(false);
  });
});
