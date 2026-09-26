import { describe, it, expect } from 'vitest';
import {
  updateUserStatusSchema,
  createCardBatchSchema,
  adminUserQuerySchema,
} from '../../../src/modules/admin/admin.validation.js';
import { ACCOUNT_STATE } from '../../../src/config/constants.js';

describe('Admin Validation Unit Tests', () => {
  describe('updateUserStatusSchema', () => {
    it('accepts valid status transition and reason', () => {
      const res = updateUserStatusSchema.safeParse({
        status: ACCOUNT_STATE.SUSPENDED,
        reason: 'Violated terms of service repeatedly.',
      });
      expect(res.success).toBe(true);
      expect(res.data.status).toBe(ACCOUNT_STATE.SUSPENDED);
    });

    it('rejects short reason under 3 characters', () => {
      const res = updateUserStatusSchema.safeParse({
        status: ACCOUNT_STATE.SUSPENDED,
        reason: 'no',
      });
      expect(res.success).toBe(false);
    });

    it('rejects unsupported status', () => {
      const res = updateUserStatusSchema.safeParse({
        status: 'RANDOM_STATUS',
        reason: 'Valid reason here',
      });
      expect(res.success).toBe(false);
    });
  });

  describe('createCardBatchSchema', () => {
    it('accepts valid hardware batch payload', () => {
      const res = createCardBatchSchema.safeParse({
        batchNumber: 'BATCH-2026-PVC-001',
        cardType: 'pvc',
        totalCards: 500,
      });
      expect(res.success).toBe(true);
      expect(res.data.totalCards).toBe(500);
    });

    it('rejects invalid card material type', () => {
      const res = createCardBatchSchema.safeParse({
        batchNumber: 'BATCH-001',
        cardType: 'gold_foil',
        totalCards: 100,
      });
      expect(res.success).toBe(false);
    });

    it('rejects totalCards outside range', () => {
      const res1 = createCardBatchSchema.safeParse({
        batchNumber: 'BATCH-001',
        cardType: 'bamboo',
        totalCards: 0,
      });
      expect(res1.success).toBe(false);

      const res2 = createCardBatchSchema.safeParse({
        batchNumber: 'BATCH-001',
        cardType: 'bamboo',
        totalCards: 100000,
      });
      expect(res2.success).toBe(false);
    });
  });

  describe('adminUserQuerySchema', () => {
    it('applies default limit of 20 and parses query', () => {
      const res = adminUserQuerySchema.safeParse({
        q: 'john',
      });
      expect(res.success).toBe(true);
      expect(res.data.limit).toBe(20);
      expect(res.data.q).toBe('john');
    });
  });
});
