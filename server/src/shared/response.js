// ---------------------------------------------------------------------------
// Standardized response helpers.
// Controllers and middleware should always use these — never res.json() raw.
// ---------------------------------------------------------------------------

/**
 * Send a success response.
 * Supports both:
 * 1. sendSuccess(res, { message, data, statusCode })
 * 2. sendSuccess(res, statusCode, message, data)
 *
 * @param {import('express').Response} res
 * @param {object|number} optionsOrStatusCode
 * @param {string} [maybeMessage]
 * @param {any} [maybeData]
 */
export function sendSuccess(res, optionsOrStatusCode = {}, maybeMessage = 'Success', maybeData = null) {
  if (typeof optionsOrStatusCode === 'number') {
    const statusCode = optionsOrStatusCode;
    const message = typeof maybeMessage === 'string' ? maybeMessage : 'Success';
    const data = maybeData;
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  const { message = 'Success', data = null, statusCode = 200 } = optionsOrStatusCode || {};
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

/**
 * Return a standardized success payload object.
 * Used by controllers that do: res.status(200).json(successResponse(data, message, meta))
 *
 * @param {any} data
 * @param {string} message
 * @param {object|null} meta
 */
export function successResponse(data = null, message = 'Success', meta = null) {
  const body = {
    success: true,
    message,
    data,
  };

  if (meta !== null && meta !== undefined) {
    body.meta = meta;
  }

  return body;
}

/**
 * Return a standardized error payload object.
 *
 * @param {string} message
 * @param {string} code
 * @param {any} details
 */
export function errorResponse(message = 'An error occurred', code = 'INTERNAL_ERROR', details = null) {
  const body = {
    success: false,
    error: { code, message },
  };

  if (details !== null && details !== undefined) {
    body.error.details = details;
  }

  return body;
}

/**
 * Send an error response.
 * Only used directly when you need manual control; prefer the error handler.
 *
 * @param {import('express').Response} res
 * @param {{ message?: string, code?: string, details?: any, statusCode?: number }} options
 */
export function sendError(
  res,
  { message = 'An error occurred', code = 'INTERNAL_ERROR', details = null, statusCode = 500 } = {},
) {
  return res.status(statusCode).json(errorResponse(message, code, details));
}
