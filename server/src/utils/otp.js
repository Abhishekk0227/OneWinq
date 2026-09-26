import { randomInt } from 'crypto';

// ---------------------------------------------------------------------------
// OTP generation utility.
// Uses crypto.randomInt — cryptographically secure.
// ---------------------------------------------------------------------------

const OTP_DIGITS = 6;
const OTP_MAX = 10 ** OTP_DIGITS; // 1_000_000

/**
 * Generate a cryptographically secure 6-digit OTP string.
 * Always returns exactly 6 characters, zero-padded if necessary.
 *
 * @returns {string} e.g. '047382'
 */
export function generateOtp() {
  const value = randomInt(0, OTP_MAX);
  return value.toString().padStart(OTP_DIGITS, '0');
}
