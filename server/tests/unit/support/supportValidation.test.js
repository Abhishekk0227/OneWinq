import { describe, it, expect } from 'vitest';
import {
  createTicketSchema,
  replyTicketSchema,
} from '../../../src/modules/support/support.validation.js';
import { TICKET_CATEGORY, TICKET_PRIORITY } from '../../../src/config/constants.js';

describe('Support Validation Unit Tests', () => {
  describe('createTicketSchema', () => {
    it('accepts valid ticket creation data with defaults', () => {
      const res = createTicketSchema.safeParse({
        subject: 'Cannot link NFC card to my profile',
        message: 'I tapped the card on my phone but it gives an activation error.',
      });
      expect(res.success).toBe(true);
      expect(res.data.category).toBe(TICKET_CATEGORY.OTHER);
      expect(res.data.priority).toBe(TICKET_PRIORITY.MEDIUM);
      expect(res.data.attachments).toEqual([]);
    });

    it('accepts explicit category and priority', () => {
      const res = createTicketSchema.safeParse({
        subject: 'Billing charge issue',
        category: TICKET_CATEGORY.BILLING_SUBSCRIPTION,
        priority: TICKET_PRIORITY.URGENT,
        message: 'Charged twice for Pro plan.',
      });
      expect(res.success).toBe(true);
      expect(res.data.category).toBe(TICKET_CATEGORY.BILLING_SUBSCRIPTION);
      expect(res.data.priority).toBe(TICKET_PRIORITY.URGENT);
    });

    it('rejects short subject under 3 chars', () => {
      const res = createTicketSchema.safeParse({
        subject: 'No',
        message: 'Test message',
      });
      expect(res.success).toBe(false);
    });

    it('rejects empty message', () => {
      const res = createTicketSchema.safeParse({
        subject: 'Valid Subject',
        message: '',
      });
      expect(res.success).toBe(false);
    });
  });

  describe('replyTicketSchema', () => {
    it('accepts valid reply text', () => {
      const res = replyTicketSchema.safeParse({
        text: 'Here is the screenshot of the error.',
        attachments: ['64b0f0000000000000000001'],
      });
      expect(res.success).toBe(true);
      expect(res.data.attachments.length).toBe(1);
    });

    it('rejects empty reply text', () => {
      const res = replyTicketSchema.safeParse({
        text: '',
      });
      expect(res.success).toBe(false);
    });
  });
});
