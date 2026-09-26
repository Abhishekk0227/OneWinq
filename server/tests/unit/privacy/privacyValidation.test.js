import { describe, it, expect } from 'vitest';
import {
  requestExportSchema,
  deleteAccountSchema,
} from '../../../src/modules/privacy/privacy.validation.js';

describe('Privacy Validation Unit Tests', () => {
  describe('requestExportSchema', () => {
    it('defaults to JSON format when empty object provided', () => {
      const res = requestExportSchema.safeParse({});
      expect(res.success).toBe(true);
      expect(res.data.format).toBe('JSON');
    });

    it('rejects unsupported format', () => {
      const res = requestExportSchema.safeParse({ format: 'XML' });
      expect(res.success).toBe(false);
    });
  });

  describe('deleteAccountSchema', () => {
    it('accepts valid password and optional reason', () => {
      const res = deleteAccountSchema.safeParse({
        password: 'SecurePassword123!',
        reason: 'No longer need the service',
      });
      expect(res.success).toBe(true);
      expect(res.data.password).toBe('SecurePassword123!');
      expect(res.data.reason).toBe('No longer need the service');
    });

    it('rejects missing or empty password', () => {
      const res1 = deleteAccountSchema.safeParse({});
      expect(res1.success).toBe(false);

      const res2 = deleteAccountSchema.safeParse({ password: '' });
      expect(res2.success).toBe(false);
    });
  });
});
