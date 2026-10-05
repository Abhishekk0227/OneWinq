import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import { config } from '../config/env.js';
import { ValidationError } from '../shared/errors.js';

// ---------------------------------------------------------------------------
// Security middleware stack — applied in app.js before any route.
// ---------------------------------------------------------------------------

/**
 * Helmet — sets secure HTTP headers.
 * Configured conservatively; relax per-route if needed.
 */
export const helmetMiddleware = helmet({
  // Content Security Policy — tighten once frontend origin is stable
  contentSecurityPolicy: config.isProduction
    ? undefined // use helmet defaults in production
    : false,    // disable CSP in dev to avoid blocking HMR / devtools
  crossOriginEmbedderPolicy: false, // Needed if serving media from Cloudinary
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow cross-origin images/assets to be loaded by browser
});

const ALLOWED_ORIGIN_PATTERNS = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https:\/\/.*\.vercel\.app$/,
  /^https:\/\/onewinq\.com$/,
  /^https:\/\/.*\.onewinq\.com$/,
];

/**
 * CORS — explicit allowlist only.
 * Wildcard origins are NEVER used.
 */
const corsOptions = {
  origin(origin, callback) {
    // Allow requests with no origin (e.g. curl, Postman, server-to-server)
    if (!origin) { return callback(null, true); }

    if (config.cors.origins.includes(origin)) {
      return callback(null, true);
    }

    if (ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin))) {
      return callback(null, true);
    }

    return callback(new Error(`CORS: origin '${origin}' is not allowed`));
  },
  credentials: true, // Required for HTTP-only cookie to be sent cross-origin
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID'],
  maxAge: 86400, // Pre-flight cache: 24 hours
};

export const corsMiddleware = cors(corsOptions);

/**
 * Cookie parser — signs cookies with COOKIE_SECRET.
 */
export const cookieMiddleware = cookieParser(config.cookie.secret);

/**
 * JSON body parser with strict size limit.
 * Returns 400 with our error envelope on oversized/malformed bodies.
 */
export const jsonBodyParser = express.json({
  limit: config.request.bodyLimit,
  strict: true,
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  },
});

/**
 * URL-encoded body parser (forms).
 */
export const urlencodedBodyParser = express.urlencoded({
  extended: false,
  limit: config.request.bodyLimit,
});

/**
 * Convert JSON parse errors from express.json() into our ValidationError format.
 * Must be placed AFTER the json body parser middleware.
 */
export function bodyParseErrorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed') {
    return next(new ValidationError('Request body contains invalid JSON'));
  }
  if (err.type === 'entity.too.large') {
    return next(new ValidationError(`Request body exceeds the size limit of ${config.request.bodyLimit}`));
  }
  return next(err);
}
