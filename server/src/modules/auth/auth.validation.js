import { z } from 'zod';
import { USERNAME, PASSWORD } from '../../config/constants.js';

// ---------------------------------------------------------------------------
// Auth validation schemas — Zod.
// All schemas produce clean error messages suitable for client consumption.
// ---------------------------------------------------------------------------

// ---- Primitives ------------------------------------------------------------

const emailSchema = z
  .string({ required_error: 'Email is required' })
  .email('Invalid email address')
  .max(254, 'Email address is too long')
  .transform((v) => v.toLowerCase().trim());

const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(PASSWORD.MIN_LENGTH, `Password must be at least ${PASSWORD.MIN_LENGTH} characters`)
  .max(PASSWORD.MAX_LENGTH, `Password must be at most ${PASSWORD.MAX_LENGTH} characters`);

const strongPasswordSchema = passwordSchema
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

const usernameSchema = z
  .string({ required_error: 'Username is required' })
  .min(USERNAME.MIN_LENGTH, `Username must be at least ${USERNAME.MIN_LENGTH} characters`)
  .max(USERNAME.MAX_LENGTH, `Username must be at most ${USERNAME.MAX_LENGTH} characters`)
  .regex(USERNAME.PATTERN, 'Username may only contain lowercase letters, numbers, and hyphens')
  .transform((v) => v.toLowerCase().trim());

const otpCodeSchema = z
  .string({ required_error: 'Verification code is required' })
  .length(6, 'Verification code must be exactly 6 digits')
  .regex(/^\d{6}$/, 'Verification code must contain only digits');

// ---- Register --------------------------------------------------------------
export const registerSchema = z.object({
  email: emailSchema,
  password: strongPasswordSchema,
  username: usernameSchema,
  displayName: z
    .string({ required_error: 'Display name is required' })
    .min(1, 'Display name cannot be empty')
    .max(100, 'Display name must be at most 100 characters')
    .trim(),
});

// ---- Verify email ----------------------------------------------------------
export const verifyEmailSchema = z.object({
  email: emailSchema,
  otp: otpCodeSchema,
});

// ---- Resend verification ---------------------------------------------------
export const resendVerificationSchema = z.object({
  email: emailSchema,
});

// ---- Login -----------------------------------------------------------------
export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

// ---- Refresh token ---------------------------------------------------------
// No body schema — refresh token is read from the HTTP-only cookie

// ---- Forgot password -------------------------------------------------------
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

// ---- Reset password --------------------------------------------------------
export const resetPasswordSchema = z.object({
  email: emailSchema,
  otp: otpCodeSchema,
  newPassword: strongPasswordSchema,
});

// ---- Change password -------------------------------------------------------
export const changePasswordSchema = z.object({
  currentPassword: z
    .string({ required_error: 'Current password is required' })
    .min(1, 'Current password is required'),
  newPassword: strongPasswordSchema,
}).refine(
  (data) => data.currentPassword !== data.newPassword,
  { message: 'New password must be different from current password', path: ['newPassword'] },
);

// ---- Email change ----------------------------------------------------------
export const requestEmailChangeSchema = z.object({
  newEmail: emailSchema,
  password: z
    .string({ required_error: 'Current password is required' })
    .min(1, 'Current password is required'),
});

export const verifyEmailChangeSchema = z.object({
  newEmail: emailSchema,
  otp: otpCodeSchema,
});

// ---- Revoke session --------------------------------------------------------
export const revokeSessionSchema = z.object({
  sessionId: z
    .string({ required_error: 'Session ID is required' })
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid session ID'),
});



// ---------------------------------------------------------------------------
// Validation helper — runs a Zod schema and returns parsed data or throws
// a structured ValidationError.
// ---------------------------------------------------------------------------
import { ValidationError } from '../../shared/errors.js';

/**
 * Validate and parse request data using a Zod schema.
 *
 * @template T
 * @param {z.ZodSchema<T>} schema
 * @param {unknown} data
 * @returns {T}
 * @throws {ValidationError}
 */
export function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = Object.fromEntries(
      result.error.issues.map((issue) => [issue.path.join('.'), issue.message]),
    );
    throw new ValidationError('Validation failed', details);
  }
  return result.data;
}
