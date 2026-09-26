import argon2 from 'argon2';
import { config } from '../../config/env.js';

// ---------------------------------------------------------------------------
// Password service — Argon2id hashing and verification.
// ---------------------------------------------------------------------------

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: config.argon2.memoryCost,
  timeCost: config.argon2.timeCost,
  parallelism: config.argon2.parallelism,
};

/**
 * Hash a password using Argon2id with configurable parameters.
 *
 * @param {string} password — plaintext password (never logged)
 * @returns {Promise<string>} Argon2id hash
 */
export async function hashPassword(password) {
  return argon2.hash(password, ARGON2_OPTIONS);
}

/**
 * Verify a plaintext password against a stored Argon2id hash.
 *
 * @param {string} password — plaintext password
 * @param {string} hash     — stored hash
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, hash) {
  return argon2.verify(hash, password);
}

// ---------------------------------------------------------------------------
// Timing-safe dummy verify.
//
// Used to prevent timing attacks: when a user is not found, we still run
// an argon2 verify so the response time is indistinguishable from a real
// password failure.
// ---------------------------------------------------------------------------

// Lazily computed so startup doesn't block.
let _dummyHash = null;

async function getDummyHash() {
  if (!_dummyHash) {
    // Pre-compute once and cache.
    _dummyHash = await argon2.hash('__dummy_timing_prevention_seed__', ARGON2_OPTIONS);
  }
  return _dummyHash;
}

/**
 * Perform a dummy Argon2 verification to consume consistent CPU time.
 * Always returns false.
 *
 * @returns {Promise<boolean>} always false
 */
export async function performDummyVerify() {
  const hash = await getDummyHash();
  // This will always fail (wrong password) but takes same time as a real verify.
  return argon2.verify(hash, '__wrong_password_that_never_matches__').catch(() => false);
}

export const passwordService = {
  hashPassword,
  verifyPassword,
  performDummyVerify,
};

export default passwordService;
