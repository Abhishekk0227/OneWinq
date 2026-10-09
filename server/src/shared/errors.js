import { HTTP, ERROR_CODE } from '../config/constants.js';

// ---------------------------------------------------------------------------
// Base application error — all typed errors extend this.
// ---------------------------------------------------------------------------
export class AppError extends Error {
  /**
   * @param {string} message      — Human-readable message (safe for client)
   * @param {string} code         — Machine-readable error code (ERROR_CODE.*)
   * @param {number} statusCode   — HTTP status code
   * @param {object} [details]    — Optional structured details (never secrets)
   * @param {boolean} [isOperational] — Operational (true) vs programmer error (false)
   */
  constructor(message, code, statusCode, details = null, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ---------------------------------------------------------------------------
// Typed error subclasses
// ---------------------------------------------------------------------------

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = null) {
    super(message, ERROR_CODE.VALIDATION_ERROR, HTTP.BAD_REQUEST, details);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details = null) {
    super(message, ERROR_CODE.VALIDATION_ERROR, HTTP.BAD_REQUEST, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', code = ERROR_CODE.AUTHENTICATION_REQUIRED) {
    super(message, code, HTTP.UNAUTHORIZED);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, ERROR_CODE.FORBIDDEN, HTTP.FORBIDDEN);
  }
}

export const ForbiddenError = AuthorizationError;

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, ERROR_CODE.NOT_FOUND, HTTP.NOT_FOUND);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists', code = ERROR_CODE.CONFLICT) {
    super(message, code, HTTP.CONFLICT);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests. Please try again later.') {
    super(message, ERROR_CODE.RATE_LIMITED, HTTP.TOO_MANY_REQUESTS);
  }
}

export class ExternalServiceError extends AppError {
  constructor(message = 'External service error', details = null) {
    super(message, ERROR_CODE.EXTERNAL_SERVICE_ERROR, HTTP.SERVICE_UNAVAILABLE, details, true);
  }
}

export class EntitlementError extends AppError {
  constructor(message = 'This feature requires an upgrade') {
    super(message, ERROR_CODE.ENTITLEMENT_REQUIRED, HTTP.FORBIDDEN);
  }
}

export class AccountStateError extends AppError {
  constructor(message, code, statusCode = HTTP.FORBIDDEN) {
    super(message, code, statusCode);
  }
}
