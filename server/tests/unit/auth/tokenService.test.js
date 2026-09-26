import { describe, it, expect } from 'vitest';

process.env.NODE_ENV = 'development';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/onewinq_test';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_that_is_long_enough_32chars__';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_that_is_long_enough_32chars_';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.COOKIE_SECRET = 'test_cookie_secret_that_is_long_enough_32chars__';
process.env.CORS_ORIGINS = 'http://localhost:5173';
process.env.LOG_LEVEL = 'error';

const {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateTokenFamily,
  buildRefreshCookieValue,
  parseRefreshCookieValue,
} = await import('../../../src/modules/auth/tokenService.js');

describe('tokenService', () => {
  describe('generateAccessToken / verifyAccessToken', () => {
    it('generates a verifiable JWT', () => {
      const payload = { userId: 'user123', sessionId: 'sess456' };
      const token = generateAccessToken(payload);
      expect(token).toBeTypeOf('string');
      expect(token.split('.')).toHaveLength(3);

      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe('user123');
      expect(decoded.sessionId).toBe('sess456');
    });

    it('throws AuthenticationError for an invalid token', () => {
      expect(() => verifyAccessToken('not.a.valid.token')).toThrow();
    });

    it('throws AuthenticationError for a tampered token', () => {
      const token = generateAccessToken({ userId: 'u1', sessionId: 's1' });
      const [header, , signature] = token.split('.');
      const fakePayload = Buffer.from(JSON.stringify({ userId: 'hacker', sessionId: 's1' })).toString('base64url');
      expect(() => verifyAccessToken(`${header}.${fakePayload}.${signature}`)).toThrow();
    });
  });

  describe('generateRefreshToken / verifyRefreshToken', () => {
    it('generates a rawToken and hash', async () => {
      const { rawToken, hash } = await generateRefreshToken();
      expect(rawToken).toBeTypeOf('string');
      expect(rawToken.length).toBeGreaterThan(32);
      expect(hash).toMatch(/^\$argon2id\$/);
    });

    it('verifies correct raw token against hash', async () => {
      const { rawToken, hash } = await generateRefreshToken();
      const valid = await verifyRefreshToken(rawToken, hash);
      expect(valid).toBe(true);
    });

    it('rejects wrong raw token', async () => {
      const { hash } = await generateRefreshToken();
      const valid = await verifyRefreshToken('wrong-token', hash);
      expect(valid).toBe(false);
    });
  });

  describe('generateTokenFamily', () => {
    it('generates a UUID string', () => {
      const family = generateTokenFamily();
      expect(family).toBeTypeOf('string');
      expect(family).toMatch(/^[0-9a-f-]{36}$/i);
    });

    it('generates unique values', () => {
      const a = generateTokenFamily();
      const b = generateTokenFamily();
      expect(a).not.toBe(b);
    });
  });

  describe('buildRefreshCookieValue / parseRefreshCookieValue', () => {
    it('round-trips tokenFamily and rawToken through cookie value', async () => {
      const family = generateTokenFamily();
      const { rawToken } = await generateRefreshToken();

      const cookieValue = buildRefreshCookieValue(family, rawToken);
      const parsed = parseRefreshCookieValue(cookieValue);

      expect(parsed).not.toBeNull();
      expect(parsed.tokenFamily).toBe(family);
      expect(parsed.rawToken).toBe(rawToken);
    });

    it('returns null for missing cookie', () => {
      expect(parseRefreshCookieValue(null)).toBeNull();
      expect(parseRefreshCookieValue('')).toBeNull();
      expect(parseRefreshCookieValue('no-separator-here')).toBeNull();
    });
  });
});
