import mongoose from 'mongoose';
import { OTP_PURPOSE } from '../../config/constants.js';

// ---------------------------------------------------------------------------
// OTP Challenge model
//
// Tracks one pending OTP verification per (email, purpose) pair.
// Old challenges are invalidated when a new one is issued for the same pair.
// ---------------------------------------------------------------------------

const { Schema, model } = mongoose;

const otpChallengeSchema = new Schema(
  {
    // ---- Target -------------------------------------------------------------
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    // userId may be null for challenges issued before the user account exists
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // ---- Purpose ------------------------------------------------------------
    purpose: {
      type: String,
      enum: Object.values(OTP_PURPOSE),
      required: true,
    },

    // ---- OTP hash — NEVER stored in plain text, NEVER logged ---------------
    // Excluded from queries by default.
    otpHash: {
      type: String,
      required: true,
      select: false,
    },

    // ---- Expiry -------------------------------------------------------------
    expiresAt: {
      type: Date,
      required: true,
    },

    // ---- Attempt tracking ---------------------------------------------------
    attempts: {
      type: Number,
      default: 0,
    },

    maxAttempts: {
      type: Number,
      required: true,
    },

    // ---- Resend tracking ----------------------------------------------------
    resendCount: {
      type: Number,
      default: 0,
    },

    maxResends: {
      type: Number,
      required: true,
    },

    lastResendAt: {
      type: Date,
      default: null,
    },

    resendCooldownSeconds: {
      type: Number,
      required: true,
    },

    // ---- State flags --------------------------------------------------------
    // isUsed: OTP was successfully verified
    isUsed: {
      type: Boolean,
      default: false,
    },

    // isInvalidated: manually invalidated (e.g. new OTP issued, account changed)
    isInvalidated: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.otpHash;
        return ret;
      },
    },
  },
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

// Find active challenge for email + purpose (main lookup path)
otpChallengeSchema.index({ email: 1, purpose: 1, isUsed: 1, isInvalidated: 1 });

// TTL — MongoDB removes expired challenges automatically
otpChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ---------------------------------------------------------------------------
// Instance helpers
// ---------------------------------------------------------------------------

/**
 * Whether this challenge has passed its expiry time.
 */
otpChallengeSchema.methods.isExpired = function () {
  return this.expiresAt < new Date();
};

/**
 * Whether this challenge is still valid for verification.
 */
otpChallengeSchema.methods.isVerifiable = function () {
  return !this.isUsed && !this.isInvalidated && !this.isExpired();
};

/**
 * Whether the user can request a resend right now.
 */
otpChallengeSchema.methods.canResend = function () {
  if (this.resendCount >= this.maxResends) { return false; }
  if (!this.lastResendAt) { return true; }
  const cooldownMs = this.resendCooldownSeconds * 1_000;
  return Date.now() - this.lastResendAt.getTime() >= cooldownMs;
};

/**
 * Seconds remaining until resend is allowed. 0 if allowed now.
 */
otpChallengeSchema.methods.resendCooldownRemainingSeconds = function () {
  if (!this.lastResendAt) { return 0; }
  const cooldownMs = this.resendCooldownSeconds * 1_000;
  const elapsed = Date.now() - this.lastResendAt.getTime();
  return Math.max(0, Math.ceil((cooldownMs - elapsed) / 1_000));
};

export const OtpChallenge = model('OtpChallenge', otpChallengeSchema);
