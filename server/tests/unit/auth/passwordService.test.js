import { describe, it, expect } from 'vitest';

// Set env before importing modules
process.env.NODE_ENV = 'development';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/onewinq_test';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_that_is_long_enough_32chars__';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_that_is_long_enough_32chars_';
process.env.COOKIE_SECRET = 'test_cookie_secret_that_is_long_enough_32chars__';
process.env.CORS_ORIGINS = 'http://localhost:5173';
process.env.LOG_LEVEL = 'error';

const { hashPassword, verifyPassword, performDummyVerify } = await import('../../../src/modules/auth/passwordService.js');

describe('passwordService', () => {
  describe('hashPassword', () => {
    it('returns an argon2 hash string', async () => {
      const hash = await hashPassword('TestPassword1!');
      expect(hash).toBeTypeOf('string');
      expect(hash).toMatch(/^\$argon2id\$/);
    });

    it('produces different hashes for the same password (salt)', async () => {
      const hash1 = await hashPassword('TestPassword1!');
      const hash2 = await hashPassword('TestPassword1!');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('returns true for correct password', async () => {
      const password = 'CorrectPassword1!';
      const hash = await hashPassword(password);
      const result = await verifyPassword(password, hash);
      expect(result).toBe(true);
    });

    it('returns false for incorrect password', async () => {
      const hash = await hashPassword('CorrectPassword1!');
      const result = await verifyPassword('WrongPassword99!', hash);
      expect(result).toBe(false);
    });

    it('returns false for empty password', async () => {
      const hash = await hashPassword('CorrectPassword1!');
      const result = await verifyPassword('', hash);
      expect(result).toBe(false);
    });
  });

  describe('performDummyVerify', () => {
    it('returns false without throwing', async () => {
      const result = await performDummyVerify();
      expect(result).toBe(false);
    });
  });
});
