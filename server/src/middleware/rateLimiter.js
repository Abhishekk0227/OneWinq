import { rateLimit } from 'express-rate-limit';
import { config } from '../config/env.js';
import { sendError } from '../shared/response.js';
import { HTTP, ERROR_CODE } from '../config/constants.js';

// ---------------------------------------------------------------------------
// Rate limiter factory.
// Each route/group declares its own limiter from this factory.
// ---------------------------------------------------------------------------

/**
 * Create a rate limiter middleware.
 *
 * @param {{ windowMs: number, max: number, message?: string }} options
 * @returns {import('express').RequestHandler}
 */
export function createRateLimiter({ windowMs, max, message = 'Too many requests. Please try again later.' }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: 'draft-7', // RateLimit-* headers (RFC 9110)
    legacyHeaders: false,
    // Use req.ip — behind a trusted reverse proxy set `app.set('trust proxy', 1)`
    keyGenerator: (req) => req.ip,
    handler(req, res) {
      return sendError(res, {
        message,
        code: ERROR_CODE.RATE_LIMITED,
        statusCode: HTTP.TOO_MANY_REQUESTS,
      });
    },
    skip: () => false,
  });
}

// ---------------------------------------------------------------------------
// Pre-built limiters for common categories.
// Import the one you need in your router.
// ---------------------------------------------------------------------------

/** Applied to all routes via app.js */
export const globalRateLimiter = createRateLimiter({
  windowMs: config.rateLimit.global.windowMs,
  max: config.rateLimit.global.max,
  message: 'Too many requests from this IP. Please slow down.',
});

/** POST /auth/login, /auth/register */
export const authRateLimiter = createRateLimiter({
  windowMs: config.rateLimit.auth.windowMs,
  max: config.rateLimit.auth.max,
  message: 'Too many authentication attempts. Please try again later.',
});

/** OTP send + verify endpoints */
export const otpRateLimiter = createRateLimiter({
  windowMs: config.rateLimit.otp.windowMs,
  max: config.rateLimit.otp.max,
  message: 'Too many OTP requests. Please wait before trying again.',
});

/** Discovery / search endpoints */
export const searchRateLimiter = createRateLimiter({
  windowMs: config.rateLimit.search.windowMs,
  max: config.rateLimit.search.max,
  message: 'Search rate limit exceeded. Please slow down.',
});

/** File / media upload endpoints */
export const uploadRateLimiter = createRateLimiter({
  windowMs: config.rateLimit.upload.windowMs,
  max: config.rateLimit.upload.max,
  message: 'Upload rate limit exceeded.',
});

/** Connection request endpoints */
export const connectionRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: 'Too many connection requests. Please try again later.',
});

/** Report submission */
export const reportRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'Report submission rate limit exceeded.',
});

/** Support ticket creation */
export const supportRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Support ticket rate limit exceeded.',
});

/** Payment initiation */
export const paymentRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many payment attempts. Please try again later.',
});

/** Admin operations */
export const adminRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: 'Admin rate limit exceeded.',
});

/** Password reset */
export const passwordResetRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many password reset requests.',
});

/** Username changes */
export const usernameChangeRateLimiter = createRateLimiter({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3,
  message: 'Too many username change attempts.',
});

/** Privacy operations (data export & account deletion) */
export const privacyRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Privacy request rate limit exceeded. Please try again later.',
});

