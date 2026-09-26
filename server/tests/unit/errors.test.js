import { describe, it, expect } from 'vitest';
import { AppError, ValidationError, AuthenticationError, NotFoundError, ConflictError } from '../../src/shared/errors.js';
import { HTTP, ERROR_CODE } from '../../src/config/constants.js';

describe('AppError', () => {
  it('creates an error with correct properties', () => {
    const err = new AppError('Something failed', ERROR_CODE.INTERNAL_ERROR, HTTP.INTERNAL);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err.message).toBe('Something failed');
    expect(err.code).toBe(ERROR_CODE.INTERNAL_ERROR);
    expect(err.statusCode).toBe(HTTP.INTERNAL);
    expect(err.isOperational).toBe(true);
  });

  it('captures stack trace', () => {
    const err = new AppError('test', ERROR_CODE.INTERNAL_ERROR, 500);
    expect(err.stack).toBeDefined();
  });
});

describe('ValidationError', () => {
  it('defaults to 400 and VALIDATION_ERROR code', () => {
    const err = new ValidationError();
    expect(err.statusCode).toBe(HTTP.BAD_REQUEST);
    expect(err.code).toBe(ERROR_CODE.VALIDATION_ERROR);
  });

  it('accepts custom message and details', () => {
    const details = { email: 'Invalid email format' };
    const err = new ValidationError('Validation failed', details);
    expect(err.message).toBe('Validation failed');
    expect(err.details).toEqual(details);
  });
});

describe('AuthenticationError', () => {
  it('defaults to 401', () => {
    const err = new AuthenticationError();
    expect(err.statusCode).toBe(HTTP.UNAUTHORIZED);
    expect(err.code).toBe(ERROR_CODE.AUTHENTICATION_REQUIRED);
  });
});

describe('NotFoundError', () => {
  it('defaults to 404', () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(HTTP.NOT_FOUND);
    expect(err.code).toBe(ERROR_CODE.NOT_FOUND);
  });

  it('accepts custom message', () => {
    const err = new NotFoundError('User not found');
    expect(err.message).toBe('User not found');
  });
});

describe('ConflictError', () => {
  it('defaults to 409', () => {
    const err = new ConflictError();
    expect(err.statusCode).toBe(HTTP.CONFLICT);
    expect(err.code).toBe(ERROR_CODE.CONFLICT);
  });
});
