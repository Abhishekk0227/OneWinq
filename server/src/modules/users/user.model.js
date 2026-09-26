import mongoose from 'mongoose';
import {
  ACCOUNT_STATE,
  USERNAME,
  CONNECTION_REQUEST_VISIBILITY,
  ADMIN_ROLE,
} from '../../config/constants.js';

// ---------------------------------------------------------------------------
// User model
//
// Security fields (passwordHash, failedLoginAttempts, lockoutUntil)
// are excluded from query results by default via `select: false`.
// Use .select('+field') explicitly when those fields are needed.
// ---------------------------------------------------------------------------

const { Schema, model } = mongoose;

const userSchema = new Schema(
  {
    // ---- Identity -----------------------------------------------------------
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    // ---- Username -----------------------------------------------------------
    username: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      minlength: USERNAME.MIN_LENGTH,
      maxlength: USERNAME.MAX_LENGTH,
      match: [USERNAME.PATTERN, 'Username may only contain lowercase letters, numbers, and hyphens'],
    },

    // ---- Display ------------------------------------------------------------
    displayName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    avatarUrl: {
      type: String,
      default: null,
    },

    // ---- Security — excluded from query results by default ------------------
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    // ---- Account state ------------------------------------------------------
    accountState: {
      type: String,
      enum: Object.values(ACCOUNT_STATE),
      default: ACCOUNT_STATE.PENDING_VERIFICATION,
      required: true,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    // ---- Brute-force protection — excluded from query results by default ----
    failedLoginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    lockoutUntil: {
      type: Date,
      default: null,
      select: false,
    },

    // ---- Activity -----------------------------------------------------------
    lastLoginAt: {
      type: Date,
      default: null,
    },

    // ---- Username history (current username change timestamp) ---------------
    usernameChangedAt: {
      type: Date,
      default: null,
    },

    // ---- Privacy & Discovery settings ---------------------------------------
    appearInDiscovery: {
      type: Boolean,
      default: true,
      index: true,
    },

    connectionRequestVisibility: {
      type: String,
      enum: Object.values(CONNECTION_REQUEST_VISIBILITY),
      default: CONNECTION_REQUEST_VISIBILITY.EVERYONE,
    },

    // ---- Role-based access control ------------------------------------------
    role: {
      type: String,
      enum: [...Object.values(ADMIN_ROLE), 'USER'],
      default: 'USER',
      index: true,
    },

    // ---- Soft deletion flags (set by deletion pipeline) --------------------
    deletionRequestedAt: {
      type: Date,
      default: null,
    },

    deletionScheduledFor: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
    toJSON: {
      transform(_doc, ret) {
        // Always strip security fields even if somehow selected
        delete ret.passwordHash;
        delete ret.failedLoginAttempts;
        delete ret.lockoutUntil;
        return ret;
      },
    },
  },
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

// Unique email (normalized)
userSchema.index({ email: 1 }, { unique: true });

// Unique username (normalized)
userSchema.index({ username: 1 }, { unique: true });

// Account state — used for discovery filtering and admin queries
userSchema.index({ accountState: 1 });

// Discovery — active users ordered by creation time
userSchema.index({ accountState: 1, createdAt: -1 });

// ---------------------------------------------------------------------------
// Instance helpers
// ---------------------------------------------------------------------------

/**
 * Returns a safe public-facing representation.
 * Never use toJSON on a document returned to clients — always use this
 * or an explicit dto function in the service layer.
 */
userSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    email: this.email,
    username: this.username,
    displayName: this.displayName,
    avatarUrl: this.avatarUrl || null,
    accountState: this.accountState,
    emailVerified: this.emailVerified,
    role: this.role || 'USER',
    appearInDiscovery: this.appearInDiscovery,
    connectionRequestVisibility: this.connectionRequestVisibility,
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

/**
 * Check whether this account is locked out due to brute-force protection.
 * Requires the document to have been queried with +lockoutUntil.
 */
userSchema.methods.isLockedOut = function () {
  return this.lockoutUntil && this.lockoutUntil > new Date();
};

export const User = model('User', userSchema);
