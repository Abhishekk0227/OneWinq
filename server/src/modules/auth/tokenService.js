import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import argon2 from 'argon2';
import { config } from '../../config/env.js';
import { AuthenticationError } from '../../shared/errors.js';
import { ERROR_CODE } from '../../config/constants.js';

// ---------------------------------------------------------------------------
// Token service — JWT access tokens + refresh token generation/verification.
// ---------------------------------------------------------------------------

// Argon2 options for refresh token hashing.
// Lower cost than passwords — refresh tokens are long and random (high entropy),
// so cracking resistance comes from randomness, not hashing cost.
const REFRESH_HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MB — sufficient for high-entropy tokens
  timeCost: 2,
  parallelism: 1,
};

// ---------------------------------------------------------------------------
// Access token
// ---------------------------------------------------------------------------

/**
 * Generate a short-lived JWT access token.
 *
 * @param {{ userId: string, sessionId: string }} payload
 * @returns {string} signed JWT
 */
export function generateAccessToken(payload) {
  return jwt.sign(
    { userId: payload.userId, sessionId: payload.sessionId },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn },
  );
}

/**
 * Verify and decode a JWT access token.
 *
 * @param {string} token
 * @returns {{ userId: string, sessionId: string, iat: number, exp: number }}
 * @throws {AuthenticationError} if invalid or expired
 */
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, config.jwt.accessSecret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AuthenticationError('Access token has expired', ERROR_CODE.TOKEN_EXPIRED);
    }
    throw new AuthenticationError('Invalid access token', ERROR_CODE.TOKEN_INVALID);
  }
}

// ---------------------------------------------------------------------------
// Refresh token
// ---------------------------------------------------------------------------

/**
 * Generate a new token family UUID.
 * One UUID per session — used to identify the session in the refresh cookie.
 *
 * @returns {string} UUID v4
 */
export function generateTokenFamily() {
  return randomUUID();
}

/**
 * Generate a cryptographically random refresh token.
 * Returns both the raw token (for the cookie) and its Argon2 hash (for DB storage).
 *
 * Raw token format: two UUIDs concatenated (high entropy).
 *
 * @returns {Promise<{ rawToken: string, hash: string }>}
 */
export async function generateRefreshToken() {
  const rawToken = `${randomUUID()}${randomUUID()}`; // ~288 bits of randomness
  const hash = await argon2.hash(rawToken, REFRESH_HASH_OPTIONS);
  return { rawToken, hash };
}

/**
 * Verify a raw refresh token against its stored Argon2 hash.
 *
 * @param {string} rawToken
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export async function verifyRefreshToken(rawToken, hash) {
  return argon2.verify(hash, rawToken).catch(() => false);
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

const COOKIE_SEPARATOR = '|';

/**
 * Build the refresh cookie value: "{tokenFamily}|{rawToken}"
 *
 * @param {string} tokenFamily
 * @param {string} rawToken
 * @returns {string}
 */
export function buildRefreshCookieValue(tokenFamily, rawToken) {
  return `${tokenFamily}${COOKIE_SEPARATOR}${rawToken}`;
}

/**
 * Parse the refresh cookie value into tokenFamily and rawToken.
 *
 * @param {string} cookieValue
 * @returns {{ tokenFamily: string, rawToken: string } | null}
 */
export function parseRefreshCookieValue(cookieValue) {
  if (!cookieValue || typeof cookieValue !== 'string') { return null; }
  const separatorIdx = cookieValue.indexOf(COOKIE_SEPARATOR);
  if (separatorIdx === -1) { return null; }
  const tokenFamily = cookieValue.slice(0, separatorIdx);
  const rawToken = cookieValue.slice(separatorIdx + 1);
  if (!tokenFamily || !rawToken) { return null; }
  return { tokenFamily, rawToken };
}

/**
 * Set the refresh token HTTP-only cookie on the response.
 *
 * @param {import('express').Response} res
 * @param {string} tokenFamily
 * @param {string} rawToken
 * @param {Date} expiresAt
 */
export function setRefreshCookie(res, tokenFamily, rawToken, expiresAt) {
  res.cookie(
    'refreshToken',
    buildRefreshCookieValue(tokenFamily, rawToken),
    {
      httpOnly: true,
      secure: config.cookie.secure,
      sameSite: config.cookie.sameSite,
      path: config.cookie.refreshPath,
      expires: expiresAt,
    },
  );
}

/**
 * Clear the refresh token cookie.
 *
 * @param {import('express').Response} res
 */
export function clearRefreshCookie(res) {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: config.cookie.refreshPath,
  });
}
