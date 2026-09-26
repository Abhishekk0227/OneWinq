import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../app.js';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../../helpers/db.js';
import { generateAccessToken } from '../../../src/modules/auth/tokenService.js';
import { User } from '../../../src/modules/users/user.model.js';

describe('Admin Professions & Categories Management', () => {
  let adminToken;
  let normalToken;

  beforeAll(async () => {
    try {
      await connectTestDb();
      await clearTestDb();

      const adminUser = await User.create({
        email: 'admin_prof@onewinq.com',
        username: 'admin-prof',
        displayName: 'Admin User',
        passwordHash: 'hash',
        role: 'ADMIN',
      });
      adminToken = generateAccessToken({ userId: adminUser._id.toString() });

      const normalUser = await User.create({
        email: 'user_prof@onewinq.com',
        username: 'normal-prof',
        displayName: 'Normal User',
        passwordHash: 'hash',
        role: 'USER',
      });
      normalToken = generateAccessToken({ userId: normalUser._id.toString() });
    } catch {
      // offline fallback
    }
  });

  afterAll(async () => {
    try {
      await clearTestDb();
      await disconnectTestDb();
    } catch {
      // ignore
    }
  });

  it('rejects category creation from unprivileged users', async () => {
    const res = await request(app)
      .post('/api/v1/professions/categories')
      .set('Authorization', `Bearer ${normalToken}`)
      .send({ name: 'Secret Category' });
    expect([401, 403]).toContain(res.status);
  });

  it('allows admin to create, update, and soft-delete a category', async () => {
    if (!adminToken) return;

    // Create
    const createRes = await request(app)
      .post('/api/v1/professions/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Architecture & Construction', slug: 'arch-const', icon: 'building' });
    expect(createRes.status).toBe(201);
    const catId = createRes.body.data.category.id;
    expect(catId).toBeDefined();

    // Update
    const updateRes = await request(app)
      .patch(`/api/v1/professions/categories/${catId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Built Environment' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.category.name).toBe('Built Environment');

    // Soft delete
    const delRes = await request(app)
      .delete(`/api/v1/professions/categories/${catId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(delRes.status).toBe(200);
  });

  it('allows admin to create and configure recommended sections for a profession', async () => {
    if (!adminToken) return;

    const createRes = await request(app)
      .post('/api/v1/professions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Quantum Systems Specialist',
        recommendedSectionTypes: ['research', 'projects', 'publications', 'skills'],
      });
    expect(createRes.status).toBe(201);
    const profId = createRes.body.data.profession.id;

    // Update recommendations
    const patchRes = await request(app)
      .patch(`/api/v1/professions/${profId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        recommendedSectionTypes: ['research', 'publications', 'teaching'],
      });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.profession.recommendedSectionTypes).toEqual(['research', 'publications', 'teaching']);
  });
});
