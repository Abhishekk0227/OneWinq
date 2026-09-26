import { describe, it, expect } from 'vitest';
import {
  createReportSchema,
  resolveReportSchema,
} from '../../../src/modules/moderation/moderation.validation.js';
import {
  REPORT_TARGET_TYPE,
  REPORT_REASON,
  REPORT_STATE,
  REPORT_ACTION,
} from '../../../src/config/constants.js';

describe('Moderation Validation Unit Tests', () => {
  describe('createReportSchema', () => {
    it('accepts valid report data', () => {
      const res = createReportSchema.safeParse({
        targetType: REPORT_TARGET_TYPE.PROFILE,
        targetId: '64b0f0000000000000000001',
        reason: REPORT_REASON.HARASSMENT,
        description: 'Repeated offensive messages sent to me.',
      });
      expect(res.success).toBe(true);
      expect(res.data.description).toBe('Repeated offensive messages sent to me.');
    });

    it('rejects invalid targetType or reason', () => {
      const res = createReportSchema.safeParse({
        targetType: 'INVALID_TARGET',
        targetId: '123',
        reason: 'NOT_A_REASON',
      });
      expect(res.success).toBe(false);
    });

    it('rejects description longer than 1000 characters', () => {
      const res = createReportSchema.safeParse({
        targetType: REPORT_TARGET_TYPE.CARD,
        targetId: 'CARD123',
        reason: REPORT_REASON.SCAM_FRAUD,
        description: 'a'.repeat(1001),
      });
      expect(res.success).toBe(false);
    });
  });

  describe('resolveReportSchema', () => {
    it('accepts valid resolution data', () => {
      const res = resolveReportSchema.safeParse({
        status: REPORT_STATE.RESOLVED,
        actionTaken: REPORT_ACTION.CONTENT_REMOVED,
        resolutionNotes: 'Removed violating content and warned account.',
      });
      expect(res.success).toBe(true);
      expect(res.data.status).toBe(REPORT_STATE.RESOLVED);
      expect(res.data.actionTaken).toBe(REPORT_ACTION.CONTENT_REMOVED);
    });

    it('rejects status other than RESOLVED or DISMISSED', () => {
      const res = resolveReportSchema.safeParse({
        status: REPORT_STATE.OPEN,
      });
      expect(res.success).toBe(false);
    });
  });
});
