import { AppError, ValidationError } from '../shared/errors.js';
import { sendError } from '../shared/response.js';
import { ERROR_CODE, HTTP } from '../config/constants.js';
import { config } from '../config/env.js';
import logger from '../utils/logger.js';

// ---------------------------------------------------------------------------
// Centralized error handler.
//
// Must be registered last in app.js as: app.use(errorHandler)
// Express recognises a 4-argument middleware as an error handler.
// ---------------------------------------------------------------------------

/**
 * Map well-known third-party/Mongoose errors → AppError subclasses.
 */
function normalizeError(err) {
  // Already an operational AppError — pass through
  if (err instanceof AppError) { return err; }

  // Mongoose validation error
  if (err.name === 'ValidationError' && err.errors) {
    const details = Object.fromEntries(
      Object.entries(err.errors).map(([field, e]) => [field, e.message]),
    );
    return new ValidationError('Validation failed', details);
  }

  // Mongoose duplicate key (unique index violation)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] ?? 'field';
    return new AppError(
      `A record with this ${field} already exists`,
      ERROR_CODE.CONFLICT,
      HTTP.CONFLICT,
    );
  }

  // Mongoose cast error (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    return new AppError(
      `Invalid value for field '${err.path}'`,
      ERROR_CODE.VALIDATION_ERROR,
      HTTP.BAD_REQUEST,
    );
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return new AppError('Invalid token', ERROR_CODE.TOKEN_INVALID, HTTP.UNAUTHORIZED);
  }
  if (err.name === 'TokenExpiredError') {
    return new AppError('Token has expired', ERROR_CODE.TOKEN_EXPIRED, HTTP.UNAUTHORIZED);
  }

  // Unknown / programmer error — treat as 500
  return new AppError(
    'An unexpected error occurred',
    ERROR_CODE.INTERNAL_ERROR,
    HTTP.INTERNAL,
    null,
    false, // not operational — may indicate a bug
  );
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const appError = normalizeError(err);

  // Log all errors; use 'error' level for 5xx, 'warn' for 4xx
  const logLevel = appError.statusCode >= 500 ? 'error' : 'warn';
  logger.log(logLevel, appError.message, {
    requestId: req.id,
    code: appError.code,
    statusCode: appError.statusCode,
    isOperational: appError.isOperational,
    // Include stack for non-operational / 5xx only in non-production
    ...(appError.statusCode >= 500 && !config.isProduction ? { stack: err.stack || appError.stack, originalError: err.message } : {}),
    // Never log userId from body/auth headers here — only from req.user set by auth middleware
    ...(req.user?.id ? { userId: req.user.id } : {}),
  });

  return sendError(res, {
    message: appError.isOperational
      ? appError.message
      : 'An unexpected error occurred', // hide programmer error details
    code: appError.code,
    statusCode: appError.statusCode,
    // Only expose details for operational errors
    details: appError.isOperational ? appError.details : null,
  });
}
