import logger from '../utils/logger.js';

/**
 * Structured HTTP request logger.
 *
 * Logs on response finish:
 *   method, url, status, duration (ms), requestId, userId (if authenticated)
 *
 * Does NOT log:
 *   - Request bodies (may contain passwords / tokens)
 *   - Authorization headers
 *   - Cookie values
 */
export function requestLogger(req, res, next) {
  const startAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startAt) / 1e6;

    const logData = {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
    };

    // Safely add user ID if present (never add full user object)
    if (req.user?.id) {
      logData.userId = req.user.id;
    }

    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'http';
    logger.log(level, `${req.method} ${req.originalUrl} ${res.statusCode}`, logData);
  });

  next();
}
