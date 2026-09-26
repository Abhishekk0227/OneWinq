import { hash as argon2Hash, verify as argon2Verify, Algorithm } from '@node-rs/argon2';
import { config } from '../../config/env.js';
import { OtpChallenge } from './otpChallenge.model.js';
import { generateOtp } from '../../utils/otp.js';
import { emailService } from '../../infrastructure/email/emailService.js';
import { AppError } from '../../shared/errors.js';
import { ERROR_CODE, OTP_PURPOSE } from '../../config/constants.js';

// ---------------------------------------------------------------------------
// OTP service — OTP creation, verification, and resend.
// Isolated from auth.service.js for clarity.
//
// SECURITY RULES enforced here:
//   - Never log OTP values
//   - Always invalidate old OTPs before issuing new ones
//   - Same response regardless of whether email exists (anti-enumeration)
//   - Resend cooldown enforced
//   - Max attempts enforced
// ---------------------------------------------------------------------------

const OTP_HASH_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 32768, // 32 MB
  timeCost: 2,
  parallelism: 1,
};

/**
 * Issue a new OTP for the given email+purpose.
 * Invalidates any existing active challenge for the same pair.
 *
 * @param {{ email: string, userId?: string, purpose: string, displayName?: string }} params
 * @returns {Promise<OtpChallenge>} the new challenge document (without otpHash)
 */
export async function issueOtp({ email, userId = null, purpose, displayName }) {
  // 1. Invalidate any existing active challenge for this email+purpose
  await OtpChallenge.updateMany(
    { email, purpose, isUsed: false, isInvalidated: false },
    { $set: { isInvalidated: true } },
  );

  // 2. Generate OTP (never logged)
  const rawOtp = generateOtp();

  // 3. Hash it
  const otpHash = await argon2Hash(rawOtp, OTP_HASH_OPTIONS);

  // 4. Build expiry
  const expiresAt = new Date(Date.now() + config.otp.expiresMinutes * 60 * 1_000);

  // 5. Create challenge
  const challenge = await OtpChallenge.create({
    email,
    userId,
    purpose,
    otpHash,
    expiresAt,
    attempts: 0,
    maxAttempts: config.otp.maxAttempts,
    resendCount: 0,
    maxResends: config.otp.maxResends,
    lastResendAt: null,
    resendCooldownSeconds: config.otp.resendCooldownSeconds,
  });

  // 6. Send email (OTP value only passed to emailService, never logged elsewhere)
  await sendOtpEmail({ purpose, email, otp: rawOtp, displayName });

  // Return challenge WITHOUT otpHash (it's selected:false by default)
  return challenge;
}

/**
 * Route OTP to the correct email template based on purpose.
 */
async function sendOtpEmail({ purpose, email, otp, displayName }) {
  const expiresMinutes = config.otp.expiresMinutes;

  switch (purpose) {
    case OTP_PURPOSE.EMAIL_VERIFICATION:
      await emailService.sendEmailVerification({ to: email, otp, expiresMinutes, displayName });
      break;
    case OTP_PURPOSE.PASSWORD_RESET:
      await emailService.sendPasswordReset({ to: email, otp, expiresMinutes });
      break;
    case OTP_PURPOSE.ACCOUNT_DELETION:
      await emailService.sendAccountDeletionOtp({ to: email, otp, expiresMinutes });
      break;
    case OTP_PURPOSE.EMAIL_CHANGE:
      await emailService.sendEmailChangeOtp({ to: email, otp, expiresMinutes });
      break;
    default:
      // Future purposes (EMAIL_CHANGE, USERNAME_CHANGE) handled when implemented
      break;
  }
}

/**
 * Find the active challenge for a given email + purpose.
 * Returns the challenge WITH otpHash (explicitly selected).
 *
 * @param {string} email
 * @param {string} purpose
 * @returns {Promise<OtpChallenge | null>}
 */
export async function findActiveChallenge(email, purpose) {
  return OtpChallenge.findOne({
    email,
    purpose,
    isUsed: false,
    isInvalidated: false,
  }).select('+otpHash');
}

/**
 * Verify an OTP code against the active challenge.
 *
 * @param {{ email: string, purpose: string, rawOtp: string }} params
 * @returns {Promise<OtpChallenge>} the verified (now used) challenge
 * @throws {AppError} on any verification failure
 */
export async function verifyOtp({ email, purpose, rawOtp }) {
  const challenge = await findActiveChallenge(email, purpose);

  // Anti-enumeration: same error for "no challenge" and "expired challenge"
  if (!challenge || !challenge.isVerifiable()) {
    throw new AppError(
      'Verification code is invalid or has expired',
      ERROR_CODE.OTP_INVALID,
      400,
    );
  }

  // Check max attempts BEFORE verifying (prevents timing oracle on attempt limit)
  if (challenge.attempts >= challenge.maxAttempts) {
    throw new AppError(
      'Maximum verification attempts exceeded. Please request a new code.',
      ERROR_CODE.OTP_MAX_ATTEMPTS,
      429,
    );
  }

  // Increment attempts atomically
  await OtpChallenge.updateOne(
    { _id: challenge._id },
    { $inc: { attempts: 1 } },
  );

  // Verify hash
  const isValid = await argon2Verify(challenge.otpHash, rawOtp).catch(() => false);

  if (!isValid) {
    // Re-check if max attempts now reached
    const updated = await OtpChallenge.findById(challenge._id);
    if (updated && updated.attempts >= updated.maxAttempts) {
      throw new AppError(
        'Maximum verification attempts exceeded. Please request a new code.',
        ERROR_CODE.OTP_MAX_ATTEMPTS,
        429,
      );
    }
    throw new AppError(
      'Verification code is incorrect',
      ERROR_CODE.OTP_INVALID,
      400,
    );
  }

  // Mark as used
  await OtpChallenge.updateOne(
    { _id: challenge._id },
    { $set: { isUsed: true } },
  );

  return challenge;
}

/**
 * Resend an OTP for an existing challenge (with cooldown/limit checks).
 *
 * @param {{ email: string, purpose: string, userId?: string, displayName?: string }} params
 * @returns {Promise<{ cooldownSeconds: number }>}
 * @throws {AppError} on cooldown or max resend limit
 */
export async function resendOtp({ email, purpose, userId, displayName }) {
  // Look up current active challenge (without hash — not needed for resend check)
  const existing = await OtpChallenge.findOne({
    email,
    purpose,
    isUsed: false,
    isInvalidated: false,
  });

  if (existing) {
    // Check resend limit
    if (existing.resendCount >= existing.maxResends) {
      throw new AppError(
        'Maximum resend limit reached. Please wait and try again later.',
        ERROR_CODE.OTP_MAX_RESENDS,
        429,
      );
    }

    // Check cooldown
    if (!existing.canResend()) {
      const remaining = existing.resendCooldownRemainingSeconds();
      throw new AppError(
        `Please wait ${remaining} seconds before requesting a new code.`,
        ERROR_CODE.OTP_COOLDOWN,
        429,
        { cooldownSeconds: remaining },
      );
    }

    // Update resend tracking on the existing document
    await OtpChallenge.updateOne(
      { _id: existing._id },
      {
        $inc: { resendCount: 1 },
        $set: { lastResendAt: new Date() },
      },
    );
  }

  // Issue a new OTP (which also invalidates the old one)
  await issueOtp({ email, userId, purpose, displayName });

  return { cooldownSeconds: config.otp.resendCooldownSeconds };
}
