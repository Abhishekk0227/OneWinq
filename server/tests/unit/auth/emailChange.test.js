import { describe, it, expect } from 'vitest';
import {
  requestEmailChangeSchema,
  verifyEmailChangeSchema,
  validate,
} from '../../../src/modules/auth/auth.validation.js';

describe('Email Change Validation', () => {
  it('validates request email change schema correctly', () => {
    const valid = validate(requestEmailChangeSchema, {
      newEmail: 'newuser@example.com',
      password: 'StrongPassword123!',
    });
    expect(valid.newEmail).toBe('newuser@example.com');
  });

  it('rejects invalid email in request email change', () => {
    expect(() =>
      validate(requestEmailChangeSchema, {
        newEmail: 'invalid-email',
        password: 'StrongPassword123!',
      }),
    ).toThrow();
  });

  it('validates verify email change schema correctly', () => {
    const valid = validate(verifyEmailChangeSchema, {
      newEmail: 'newuser@example.com',
      otp: '123456',
    });
    expect(valid.otp).toBe('123456');
  });

  it('rejects non-6-digit OTP', () => {
    expect(() =>
      validate(verifyEmailChangeSchema, {
        newEmail: 'newuser@example.com',
        otp: '123',
      }),
    ).toThrow();
  });
});
