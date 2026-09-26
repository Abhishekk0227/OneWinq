import { describe, it, expect } from 'vitest';
import request from 'supertest';

// ---------------------------------------------------------------------------
// Set env BEFORE any app modules are imported.
// The env validator runs at module-load time; all required vars must be set.
// ---------------------------------------------------------------------------
process.env.NODE_ENV = 'development';
process.env.PORT = '5001';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/onewinq_test';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_that_is_long_enough_32chars__';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_that_is_long_enough_32chars_';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.COOKIE_SECRET = 'test_cookie_secret_that_is_long_enough_32chars__';
process.env.CORS_ORIGINS = 'http://localhost:5173';
process.env.LOG_LEVEL = 'error'; // silence logs during tests

const { default: app } = await import('../../app.js');

describe('Health Endpoints', () => {
  describe('GET /health', () => {
    it('returns 200 with server info', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        name: 'onewinq-server',
        version: expect.any(String),
        uptime: expect.any(Number),
        startedAt: expect.any(String),
      });
    });
  });

  describe('GET /health/live', () => {
    it('returns 200 regardless of external deps', async () => {
      const res = await request(app).get('/health/live');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ok');
    });
  });

  describe('GET /health/ready', () => {
    it('returns readiness response (200 if MongoDB up, 503 if not)', async () => {
      const res = await request(app).get('/health/ready');
      expect([200, 503]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data.dependencies.database).toBe('connected');
      } else {
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('NOT_READY');
      }
    });
  });
});

describe('404 Handler', () => {
  it('returns 404 with error envelope for unknown routes', async () => {
    const res = await request(app).get('/api/v1/nonexistent-route');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('includes X-Request-ID in response headers', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('echoes back client-supplied X-Request-ID', async () => {
    const clientId = 'my-custom-request-id-123';
    const res = await request(app)
      .get('/health')
      .set('X-Request-ID', clientId);
    expect(res.headers['x-request-id']).toBe(clientId);
  });
});

describe('Security Headers', () => {
  it('sets X-Content-Type-Options: nosniff', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('does not expose X-Powered-By', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('sets Strict-Transport-Security header', async () => {
    const res = await request(app).get('/health');
    // Helmet sets HSTS by default
    expect(res.headers['strict-transport-security']).toBeDefined();
  });
});

describe('Response Envelope', () => {
  it('success responses always have success:true and message', async () => {
    const res = await request(app).get('/health');
    expect(res.body).toMatchObject({
      success: true,
      message: expect.any(String),
    });
  });

  it('error responses always have success:false and error.code', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.body).toMatchObject({
      success: false,
      error: {
        code: expect.any(String),
        message: expect.any(String),
      },
    });
  });
});
