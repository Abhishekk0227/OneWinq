import winston from 'winston';
import { config } from '../config/env.js';

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

// ---------------------------------------------------------------------------
// Dev format — human-readable coloured output
// ---------------------------------------------------------------------------
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, requestId, userId, stack, ...meta }) => {
    let line = `${ts} [${level}]`;
    if (requestId) { line += ` [${requestId}]`; }
    if (userId) { line += ` [user:${userId}]`; }
    line += ` ${message}`;
    if (Object.keys(meta).length) { line += ` ${JSON.stringify(meta)}`; }
    if (stack) { line += `\n${stack}`; }
    return line;
  }),
);

// ---------------------------------------------------------------------------
// Production format — structured JSON (safe — no secrets)
// ---------------------------------------------------------------------------
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json(),
);

const logger = winston.createLogger({
  level: config.logging.level,
  format: config.isDevelopment ? devFormat : prodFormat,
  transports: [new winston.transports.Console()],
  // Prevent winston from exiting on uncaught exceptions — we handle those ourselves
  exitOnError: false,
});

export { logger };
export default logger;
