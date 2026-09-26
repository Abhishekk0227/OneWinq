import { describe, it, expect } from 'vitest';
import {
  listNotificationsSchema,
  updatePreferencesSchema,
  validate,
} from '../../../src/modules/notifications/notification.validation.js';

describe('Notification Validation & Preferences Schemas', () => {
  it('validates listNotificationsSchema with defaults and boolean preprocessing', () => {
    const emptyQuery = validate(listNotificationsSchema, {});
    expect(emptyQuery.limit).toBe(20);
    expect(emptyQuery.cursor).toBeUndefined();
    expect(emptyQuery.isRead).toBeUndefined();

    const queryWithTrue = validate(listNotificationsSchema, {
      cursor: '60c72b2f9b1d8b2bad000001',
      limit: '15',
      isRead: 'true',
    });
    expect(queryWithTrue.limit).toBe(15);
    expect(queryWithTrue.cursor).toBe('60c72b2f9b1d8b2bad000001');
    expect(queryWithTrue.isRead).toBe(true);

    const queryWithFalse = validate(listNotificationsSchema, {
      isRead: 'false',
    });
    expect(queryWithFalse.isRead).toBe(false);
  });

  it('enforces limit boundary constraints (1 to 50)', () => {
    expect(() => validate(listNotificationsSchema, { limit: 0 })).toThrow();
    expect(() => validate(listNotificationsSchema, { limit: 51 })).toThrow();
  });

  it('validates partial preference updates', () => {
    const validPatch = {
      inApp: {
        connectionRequests: false,
        messages: true,
      },
      email: {
        marketing: true,
      },
    };

    const parsed = validate(updatePreferencesSchema, validPatch);
    expect(parsed.inApp.connectionRequests).toBe(false);
    expect(parsed.inApp.messages).toBe(true);
    expect(parsed.email.marketing).toBe(true);
  });

  it('rejects invalid preference values', () => {
    const invalidPatch = {
      inApp: {
        connectionRequests: 'not-a-boolean',
      },
    };

    expect(() => validate(updatePreferencesSchema, invalidPatch)).toThrow();
  });
});
