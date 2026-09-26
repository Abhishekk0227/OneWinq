import { randomUUID } from 'crypto';
import { User } from '../users/user.model.js';
import { Session } from './session.model.js';
import { hashPassword, verifyPassword, performDummyVerify } from './passwordService.js';
import {
  generateAccessToken,
  generateRefreshToken,
  generateTokenFamily,
  verifyRefreshToken,
} from './tokenService.js';
import { issueOtp, verifyOtp, resendOtp } from './otp.service.js';
import { emailService } from '../../infrastructure/email/emailService.js';
import { parseDeviceInfo } from '../../utils/deviceInfo.js';
import { config } from '../../config/env.js';
import {
  ConflictError,
  AuthenticationError,
  AppError,
  NotFoundError,
} from '../../shared/errors.js';
import {
  ACCOUNT_STATE,
  ERROR_CODE,
  OTP_PURPOSE,
} from '../../config/constants.js';
import logger from '../../utils/logger.js';

// ---------------------------------------------------------------------------
// Brute-force protection thresholds
// ---------------------------------------------------------------------------
const LOCKOUT_TIERS = [
  { attempts: 5,  lockoutMs: 5 * 60 * 1_000 },    //  5 minutes
  { attempts: 10, lockoutMs: 30 * 60 * 1_000 },    // 30 minutes
  { attempts: 20, lockoutMs: 60 * 60 * 1_000 },    //  1 hour
];

function getLockoutMs(attempts) {
  for (let i = LOCKOUT_TIERS.length - 1; i >= 0; i--) {
    if (attempts >= LOCKOUT_TIERS[i].attempts) {
      return LOCKOUT_TIERS[i].lockoutMs;
    }
  }
  return 0;
}

/**
 * Build a partial IP representation for session display (e.g. '*.*.123.45').
 * Never stores the raw IP accessible to profile owners.
 */
function partialIp(ip) {
  if (!ip || ip === 'unknown') { return 'Unknown'; }
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `*.*.${parts[2]}.${parts[3]}`;
  }
  // IPv6 — show last segment only
  const segments = ip.split(':');
  return `*:...:${segments.at(-1) || '?'}`;
}

/**
 * Parse a duration string like '7d', '24h', '30m' into milliseconds.
 */
function parseDurationMs(str) {
  const match = String(str).match(/^(\d+)(d|h|m|s)$/);
  if (!match) { return 7 * 24 * 60 * 60 * 1_000; } // default 7 days
  const n = parseInt(match[1], 10);
  const unit = match[2];
  const unitMap = { d: 86_400_000, h: 3_600_000, m: 60_000, s: 1_000 };
  return n * unitMap[unit];
}

/**
 * Compute the refresh token expiry Date from the configured string.
 */
function refreshTokenExpiresAt() {
  return new Date(Date.now() + parseDurationMs(config.jwt.refreshExpiresIn));
}

// ---------------------------------------------------------------------------
// Auth operations
// ---------------------------------------------------------------------------

/**
 * Register a new user account.
 *
 * 1. Validate uniqueness (email, username)
 * 2. Hash password
 * 3. Create user (PENDING_VERIFICATION)
 * 4. Issue email verification OTP
 *
 * @param {{ email, password, username, displayName }} data
 */
export async function register({ email, password, username, displayName }) {
  // Check email uniqueness
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    if (existingUser.accountState === ACCOUNT_STATE.PENDING_VERIFICATION && !existingUser.emailVerified) {
      // If unverified pending account, check if new username collides with another user
      if (existingUser.username !== username) {
        const usernameTaken = await User.findOne({ username, _id: { $ne: existingUser._id } }).lean();
        if (usernameTaken) {
          throw new ConflictError('This username is already taken', ERROR_CODE.USERNAME_TAKEN);
        }
      }

      // Re-hash password, update user details, and re-issue verification OTP
      const passwordHash = await hashPassword(password);
      existingUser.passwordHash = passwordHash;
      existingUser.username = username;
      existingUser.displayName = displayName;
      await existingUser.save();

      await issueOtp({
        email,
        userId: existingUser._id.toString(),
        purpose: OTP_PURPOSE.EMAIL_VERIFICATION,
        displayName,
      });

      logger.info('User re-registered pending verification', { userId: existingUser._id, username });
      return existingUser.toSafeObject();
    }

    throw new ConflictError('An account with this email already exists', ERROR_CODE.CONFLICT);
  }

  // Check username uniqueness
  const usernameExists = await User.findOne({ username }).lean();
  if (usernameExists) {
    throw new ConflictError('This username is already taken', ERROR_CODE.USERNAME_TAKEN);
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const user = await User.create({
    email,
    passwordHash,
    username,
    displayName,
    accountState: ACCOUNT_STATE.PENDING_VERIFICATION,
    emailVerified: false,
  });

  // Issue email verification OTP
  await issueOtp({
    email,
    userId: user._id.toString(),
    purpose: OTP_PURPOSE.EMAIL_VERIFICATION,
    displayName,
  });

  logger.info('User registered', { userId: user._id, username });

  return user.toSafeObject();
}

/**
 * Verify email with OTP code.
 *
 * @param {{ email, otp }} data
 */
export async function verifyEmail({ email, otp }) {
  // Verify OTP (throws on failure)
  await verifyOtp({ email, purpose: OTP_PURPOSE.EMAIL_VERIFICATION, rawOtp: otp });

  // Activate the user account
  const user = await User.findOneAndUpdate(
    { email, accountState: ACCOUNT_STATE.PENDING_VERIFICATION },
    { $set: { accountState: ACCOUNT_STATE.ACTIVE, emailVerified: true } },
    { new: true },
  );

  if (!user) {
    // Either already verified, or user was deleted in the interim
    throw new AppError('Account not found or already verified', ERROR_CODE.NOT_FOUND, 404);
  }

  logger.info('Email verified', { userId: user._id });

  return user.toSafeObject();
}

/**
 * Resend email verification OTP.
 * Uses anti-enumeration: always returns success even if email doesn't exist.
 *
 * @param {{ email }} data
 */
export async function resendEmailVerification({ email }) {
  const user = await User.findOne({ email }).lean();

  // Anti-enumeration: don't reveal whether the email exists
  if (!user || user.accountState !== ACCOUNT_STATE.PENDING_VERIFICATION) {
    // Silently succeed
    return { message: 'If this email is registered and pending verification, a new code has been sent.' };
  }

  await resendOtp({
    email,
    userId: user._id.toString(),
    purpose: OTP_PURPOSE.EMAIL_VERIFICATION,
    displayName: user.displayName,
  });

  return { message: 'A new verification code has been sent to your email.' };
}

/**
 * Authenticate a user and create a session.
 *
 * @param {{ email, password }} credentials
 * @param {import('express').Request} req — used for device info
 * @returns {{ accessToken, user, session }}
 */
export async function login({ email, password }, req) {
  // Find user — explicitly select security fields
  const user = await User.findOne({ email })
    .select('+passwordHash +failedLoginAttempts +lockoutUntil');

  // Anti-enumeration + timing attack prevention
  if (!user) {
    await performDummyVerify();
    throw new AuthenticationError('Invalid email or password', ERROR_CODE.INVALID_CREDENTIALS);
  }

  // Account state gate (reveal generic messages — don't confirm what happened)
  if (user.accountState === ACCOUNT_STATE.PENDING_VERIFICATION) {
    throw new AppError(
      'Please verify your email address before logging in.',
      ERROR_CODE.ACCOUNT_PENDING_VERIFICATION,
      403,
    );
  }

  if (user.accountState === ACCOUNT_STATE.SUSPENDED) {
    // Don't reveal suspension — looks like invalid credentials
    await performDummyVerify();
    throw new AuthenticationError('Invalid email or password', ERROR_CODE.INVALID_CREDENTIALS);
  }

  if (user.accountState === ACCOUNT_STATE.DEACTIVATED) {
    throw new AppError(
      'This account has been deactivated.',
      ERROR_CODE.ACCOUNT_DEACTIVATED,
      403,
    );
  }

  if (user.accountState === ACCOUNT_STATE.DELETION_PENDING ||
      user.accountState === ACCOUNT_STATE.PERMANENTLY_DELETED) {
    await performDummyVerify();
    throw new AuthenticationError('Invalid email or password', ERROR_CODE.INVALID_CREDENTIALS);
  }

  // Lockout check
  if (user.isLockedOut()) {
    const remainingMs = user.lockoutUntil.getTime() - Date.now();
    const remainingMin = Math.ceil(remainingMs / 60_000);
    throw new AppError(
      `Account is temporarily locked. Try again in ${remainingMin} minute(s).`,
      ERROR_CODE.RATE_LIMITED,
      429,
    );
  }

  // Verify password
  const isPasswordValid = await verifyPassword(password, user.passwordHash);

  if (!isPasswordValid) {
    // Increment failed attempts
    const newAttempts = (user.failedLoginAttempts || 0) + 1;
    const lockoutMs = getLockoutMs(newAttempts);
    const lockoutUntil = lockoutMs > 0 ? new Date(Date.now() + lockoutMs) : null;

    await User.updateOne(
      { _id: user._id },
      { $set: { failedLoginAttempts: newAttempts, lockoutUntil } },
    );

    throw new AuthenticationError('Invalid email or password', ERROR_CODE.INVALID_CREDENTIALS);
  }

  // Reset failed attempts on successful password verify
  await User.updateOne(
    { _id: user._id },
    { $set: { failedLoginAttempts: 0, lockoutUntil: null, lastLoginAt: new Date() } },
  );

  // Create session
  const deviceInfo = parseDeviceInfo(req);
  const tokenFamily = generateTokenFamily();
  const { rawToken, hash: refreshTokenHash } = await generateRefreshToken();
  const expiresAt = refreshTokenExpiresAt();

  const session = await Session.create({
    userId: user._id,
    tokenFamily,
    refreshTokenHash,
    isActive: true,
    deviceName: deviceInfo.deviceName,
    userAgent: deviceInfo.userAgent,
    ipHash: randomUUID(), // placeholder — real implementation would use a real hash
    ipPartial: partialIp(deviceInfo.ipAddress),
    expiresAt,
    lastUsedAt: new Date(),
  });

  // Generate access token
  const accessToken = generateAccessToken({
    userId: user._id.toString(),
    sessionId: session._id.toString(),
  });

  // Send new-login notification (non-critical — login succeeds even if email fails)
  emailService.sendNewLoginNotification({
    to: email,
    deviceName: deviceInfo.deviceName,
    ipAddress: deviceInfo.ipAddress,
    loginAt: new Date(),
  }).catch((err) => {
    logger.warn('Failed to send login notification', { userId: user._id, error: err.message });
  });

  logger.info('User logged in', { userId: user._id, sessionId: session._id });

  return {
    accessToken,
    tokenFamily,
    rawToken,
    expiresAt,
    user: user.toSafeObject(),
    session: session.toSafeObject(),
  };
}

/**
 * Rotate a refresh token.
 * Detects reuse and invalidates the entire session family on detection.
 *
 * @param {{ tokenFamily: string, rawToken: string }} params
 * @returns {{ accessToken, tokenFamily, rawToken, expiresAt }}
 */
export async function refreshTokens({ tokenFamily, rawToken }) {
  // Find session by tokenFamily — explicitly select the hash
  const session = await Session.findOne({ tokenFamily }).select('+refreshTokenHash');

  // Session not found — may have been revoked or expired
  if (!session) {
    throw new AuthenticationError('Session not found or has expired', ERROR_CODE.SESSION_INVALID);
  }

  if (!session.isActive) {
    // Session was already revoked — possible reuse of an old cookie
    logger.warn('Refresh attempt on inactive session — possible token reuse', {
      tokenFamily,
      userId: session.userId,
    });
    throw new AuthenticationError('Session is no longer active', ERROR_CODE.REUSE_DETECTED);
  }

  if (session.expiresAt < new Date()) {
    await Session.updateOne({ _id: session._id }, { $set: { isActive: false } });
    throw new AuthenticationError('Session has expired', ERROR_CODE.TOKEN_EXPIRED);
  }

  // Verify the refresh token against stored hash
  const isValid = await verifyRefreshToken(rawToken, session.refreshTokenHash);

  if (!isValid) {
    // REUSE DETECTED — token doesn't match stored hash.
    // This means someone is using an old (already rotated) token.
    // Invalidate the entire session immediately.
    logger.warn('Refresh token reuse detected — invalidating session', {
      tokenFamily,
      userId: session.userId,
    });

    await Session.updateOne(
      { _id: session._id },
      { $set: { isActive: false } },
    );

    throw new AuthenticationError(
      'Token reuse detected. Session has been invalidated for your security.',
      ERROR_CODE.REUSE_DETECTED,
    );
  }

  // Issue new refresh token (rotation)
  const { rawToken: newRawToken, hash: newHash } = await generateRefreshToken();
  const newExpiresAt = refreshTokenExpiresAt();

  await Session.updateOne(
    { _id: session._id },
    {
      $set: {
        refreshTokenHash: newHash,
        expiresAt: newExpiresAt,
        lastUsedAt: new Date(),
      },
    },
  );

  // Generate new access token
  const accessToken = generateAccessToken({
    userId: session.userId.toString(),
    sessionId: session._id.toString(),
  });

  return {
    accessToken,
    tokenFamily, // same family — same session
    rawToken: newRawToken,
    expiresAt: newExpiresAt,
  };
}

/**
 * Logout the current session.
 *
 * @param {{ tokenFamily: string }} params
 */
export async function logout({ tokenFamily }) {
  if (!tokenFamily) { return; }

  await Session.updateOne(
    { tokenFamily, isActive: true },
    { $set: { isActive: false } },
  );
}

/**
 * Revoke all sessions for a user except the current one.
 *
 * @param {{ userId: string, exceptSessionId: string }} params
 */
export async function logoutOtherSessions({ userId, exceptSessionId }) {
  await Session.updateMany(
    {
      userId,
      isActive: true,
      _id: { $ne: exceptSessionId },
    },
    { $set: { isActive: false } },
  );
}

/**
 * Get all active sessions for a user.
 *
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function getActiveSessions(userId) {
  const sessions = await Session.find({ userId, isActive: true }).sort({ lastUsedAt: -1 });
  return sessions.map((s) => s.toSafeObject());
}

/**
 * Revoke a specific session (must belong to the requesting user).
 *
 * @param {{ userId: string, sessionId: string }} params
 */
export async function revokeSession({ userId, sessionId }) {
  const session = await Session.findOne({ _id: sessionId, userId });

  if (!session) {
    throw new NotFoundError('Session not found');
  }

  if (!session.isActive) {
    // Already revoked — idempotent
    return;
  }

  await Session.updateOne({ _id: sessionId }, { $set: { isActive: false } });
}

/**
 * Initiate password reset (forgot password flow).
 * Anti-enumeration: always returns success regardless of whether email exists.
 *
 * @param {{ email }} data
 */
export async function forgotPassword({ email }) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).lean();

  if (user && (user.accountState === ACCOUNT_STATE.ACTIVE || user.accountState === ACCOUNT_STATE.PENDING_VERIFICATION)) {
    try {
      await issueOtp({
        email: user.email,
        userId: user._id.toString(),
        purpose: OTP_PURPOSE.PASSWORD_RESET,
        displayName: user.displayName,
      });
    } catch (err) {
      // Log but don't expose — anti-enum
      logger.warn('Failed to issue password reset OTP', { error: err.message });
    }
  } else if (!user) {
    if (config.isDevelopment || config.isTest) {
      console.log('\n⚠️  [DEV NOTICE: FORGOT PASSWORD]');
      console.log(`   No registered account found with email: "${normalizedEmail}"`);
      console.log('   (If you have not registered yet, please create an account at http://localhost:5173/signup)\n');
      logger.warn(`[ForgotPassword] No account found with email: "${normalizedEmail}".`);
    }
  } else {
    if (config.isDevelopment || config.isTest) {
      console.log('\n⚠️  [DEV NOTICE: FORGOT PASSWORD]');
      console.log(`   User found with email "${normalizedEmail}", but accountState is "${user.accountState}".`);
      logger.warn(`[ForgotPassword] Account state is "${user.accountState}".`);
    }
  }

  // Always return the same message — never reveal whether email exists
  return {
    message: 'If an account with this email exists, a password reset code has been sent.',
  };
}

/**
 * Complete password reset using OTP.
 *
 * @param {{ email, otp, newPassword }} data
 */
export async function resetPassword({ email, otp, newPassword }) {
  const normalizedEmail = (email || '').trim().toLowerCase();

  // Verify OTP (throws on failure)
  await verifyOtp({ email: normalizedEmail, purpose: OTP_PURPOSE.PASSWORD_RESET, rawOtp: otp });

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update user — activate if was pending verification
  const user = await User.findOneAndUpdate(
    { email: normalizedEmail, accountState: { $in: [ACCOUNT_STATE.ACTIVE, ACCOUNT_STATE.PENDING_VERIFICATION] } },
    { $set: { passwordHash, accountState: ACCOUNT_STATE.ACTIVE, emailVerified: true } },
    { new: true },
  );

  if (!user) {
    throw new NotFoundError('Account not found');
  }

  // Invalidate ALL sessions — full security logout on password reset
  await Session.updateMany({ userId: user._id }, { $set: { isActive: false } });

  // Send security notification
  emailService.sendPasswordChanged({
    to: normalizedEmail,
    deviceName: 'Password Reset',
    changedAt: new Date(),
  }).catch((err) => {
    logger.warn('Failed to send password changed notification', { error: err.message });
  });

  logger.info('Password reset completed', { userId: user._id });

  return { message: 'Password has been reset successfully. Please log in with your new password.' };
}

/**
 * Change password (authenticated — requires current password).
 * Keeps current session active; invalidates all other sessions.
 *
 * @param {{ userId: string, sessionId: string, currentPassword: string, newPassword: string, req }} params
 */
export async function changePassword({ userId, sessionId, currentPassword, newPassword, req }) {
  const user = await User.findById(userId).select('+passwordHash');

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Verify current password
  const isValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new AuthenticationError('Current password is incorrect', ERROR_CODE.INVALID_CREDENTIALS);
  }

  const passwordHash = await hashPassword(newPassword);

  await User.updateOne({ _id: userId }, { $set: { passwordHash } });

  // Invalidate all OTHER sessions
  await Session.updateMany(
    { userId, isActive: true, _id: { $ne: sessionId } },
    { $set: { isActive: false } },
  );

  // Send notification
  const deviceInfo = parseDeviceInfo(req);
  emailService.sendPasswordChanged({
    to: user.email,
    deviceName: deviceInfo.deviceName,
    changedAt: new Date(),
  }).catch(() => {});

  logger.info('Password changed', { userId });

  return { message: 'Password changed successfully. Other sessions have been signed out.' };
}

/**
 * Request a change of login email address.
 * 1. Verifies current password.
 * 2. Checks if newEmail is already taken by another account.
 * 3. Issues OTP to newEmail.
 */
export async function requestEmailChange({ userId, currentPassword, newEmail }) {
  const normalizedNewEmail = newEmail.toLowerCase().trim();

  const user = await User.findById(userId).select('+passwordHash');
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const isPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isPasswordValid) {
    throw new AuthenticationError('Current password is incorrect');
  }

  if (user.email === normalizedNewEmail) {
    throw new ConflictError('New email must be different from current email');
  }

  const existing = await User.findOne({ email: normalizedNewEmail });
  if (existing) {
    throw new ConflictError('Email address is already in use');
  }

  await issueOtp({
    email: normalizedNewEmail,
    purpose: OTP_PURPOSE.EMAIL_CHANGE,
    userId: user._id,
    displayName: user.displayName,
  });

  return { message: 'Confirmation code sent to your new email address.' };
}

/**
 * Verify new email address with OTP and update account.
 * 1. Verifies OTP for (newEmail, EMAIL_CHANGE).
 * 2. Updates user email.
 * 3. Sends security notification alert to old email address.
 */
export async function verifyEmailChange({ userId, newEmail, otp }) {
  const normalizedNewEmail = newEmail.toLowerCase().trim();

  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const existing = await User.findOne({ email: normalizedNewEmail });
  if (existing && existing._id.toString() !== userId.toString()) {
    throw new ConflictError('Email address is already in use');
  }

  await verifyOtp({
    email: normalizedNewEmail,
    purpose: OTP_PURPOSE.EMAIL_CHANGE,
    rawOtp: otp,
  });

  const oldEmail = user.email;
  user.email = normalizedNewEmail;
  await user.save();

  // Send security notification to old email address
  emailService.sendEmailChangedNotification({
    to: oldEmail,
    oldEmail,
    newEmail: normalizedNewEmail,
    changedAt: new Date(),
  }).catch(() => {});

  logger.info('User email address changed', { userId, oldEmail, newEmail: normalizedNewEmail });

  return { message: 'Email address updated successfully.', email: normalizedNewEmail };
}

