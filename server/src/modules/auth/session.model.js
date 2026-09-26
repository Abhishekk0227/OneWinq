import mongoose from 'mongoose';

// ---------------------------------------------------------------------------
// Session model
//
// One document per device/session per user.
// Stores the hashed refresh token for rotation and reuse detection.
//
// Security fields (refreshTokenHash) are excluded by default.
// ---------------------------------------------------------------------------

const { Schema, model } = mongoose;

const sessionSchema = new Schema(
  {
    // ---- Ownership ----------------------------------------------------------
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // ---- Token family -------------------------------------------------------
    // UUID that identifies this session family.
    // Stored in the refresh cookie alongside the raw token.
    // If a token is presented that doesn't match the stored hash, it means
    // reuse was detected — the entire session must be invalidated.
    tokenFamily: {
      type: String,
      required: true,
    },

    // ---- Refresh token hash — never returned in queries by default ----------
    refreshTokenHash: {
      type: String,
      required: true,
      select: false,
    },

    // ---- Session state ------------------------------------------------------
    isActive: {
      type: Boolean,
      default: true,
    },

    // ---- Device info (stored for "active sessions" display) -----------------
    deviceName: {
      type: String,
      default: 'Unknown Device',
      maxlength: 200,
    },

    userAgent: {
      type: String,
      maxlength: 500,
      select: false, // raw UA is internal only
    },

    // IP is hashed before storage — never expose raw IP to profile owner
    ipHash: {
      type: String,
      select: false,
    },

    // Human-readable IP representation (last 2 octets only, e.g. '*.*.123.45')
    ipPartial: {
      type: String,
      maxlength: 50,
    },

    // ---- Timestamps ---------------------------------------------------------
    expiresAt: {
      type: Date,
      required: true,
    },

    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.refreshTokenHash;
        delete ret.userAgent;
        delete ret.ipHash;
        return ret;
      },
    },
  },
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

// Find session by token family (used on every refresh)
sessionSchema.index({ tokenFamily: 1 }, { unique: true });

// All sessions for a user — for listing / bulk revocation
sessionSchema.index({ userId: 1, isActive: 1 });

// TTL — MongoDB automatically removes expired sessions
// Removes documents where expiresAt < now
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ---------------------------------------------------------------------------
// Instance helpers
// ---------------------------------------------------------------------------

/**
 * Safe representation for "active sessions" listing.
 * Never includes refreshTokenHash, userAgent, or raw IP.
 */
sessionSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    deviceName: this.deviceName,
    ipPartial: this.ipPartial,
    lastUsedAt: this.lastUsedAt,
    createdAt: this.createdAt,
    expiresAt: this.expiresAt,
    isActive: this.isActive,
  };
};

export const Session = model('Session', sessionSchema);
