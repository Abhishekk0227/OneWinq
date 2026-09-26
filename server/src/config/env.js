import { z } from 'zod';
import { config as loadDotenv } from 'dotenv';

loadDotenv();

// ---------------------------------------------------------------------------
// Schema — every env var the app needs, validated at startup.
// If validation fails the process exits immediately with a clear message.
// ---------------------------------------------------------------------------

const envSchema = z.object({
  // Runtime
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),

  // MongoDB
  MONGODB_URI: z.string().url('MONGODB_URI must be a valid connection string'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Cookies
  COOKIE_SECRET: z.string().min(32, 'COOKIE_SECRET must be at least 32 chars'),
  COOKIE_SECURE: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('lax'),
  REFRESH_COOKIE_PATH: z.string().default('/api/v1/auth'),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  // Argon2
  ARGON2_MEMORY_COST: z.coerce.number().int().default(65536),   // 64 MB
  ARGON2_TIME_COST: z.coerce.number().int().default(3),
  ARGON2_PARALLELISM: z.coerce.number().int().default(1),

  // OTP
  OTP_EXPIRES_MINUTES: z.coerce.number().int().default(10),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().default(5),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().default(60),
  OTP_MAX_RESENDS: z.coerce.number().int().default(5),

  // Email
  EMAIL_PROVIDER: z.enum(['console', 'sendgrid', 'ses', 'smtp']).default('console'),
  EMAIL_FROM_ADDRESS: z.string().email().default('no-reply@onewinq.com'),
  EMAIL_FROM_NAME: z.string().default('OneWinq'),
  // Provider-specific (optional at startup — validated per-provider at runtime)
  SENDGRID_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SES_REGION: z.string().optional(),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Razorpay
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  // Storage
  STORAGE_PROVIDER: z.enum(['local', 's3', 'cloudinary']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('uploads'),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  // Rate limits (requests per window)
  RATE_LIMIT_GLOBAL_MAX: z.coerce.number().int().default(500),
  RATE_LIMIT_GLOBAL_WINDOW_MS: z.coerce.number().int().default(15 * 60 * 1000),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().default(20),
  RATE_LIMIT_AUTH_WINDOW_MS: z.coerce.number().int().default(15 * 60 * 1000),
  RATE_LIMIT_OTP_MAX: z.coerce.number().int().default(5),
  RATE_LIMIT_OTP_WINDOW_MS: z.coerce.number().int().default(15 * 60 * 1000),
  RATE_LIMIT_SEARCH_MAX: z.coerce.number().int().default(60),
  RATE_LIMIT_SEARCH_WINDOW_MS: z.coerce.number().int().default(60 * 1000),
  RATE_LIMIT_UPLOAD_MAX: z.coerce.number().int().default(20),
  RATE_LIMIT_UPLOAD_WINDOW_MS: z.coerce.number().int().default(60 * 60 * 1000),

  // Data retention
  NOTIFICATION_RETENTION_DAYS: z.coerce.number().int().default(30),
  ANALYTICS_RAW_RETENTION_DAYS: z.coerce.number().int().default(365),
  AUDIT_LOG_RETENTION_DAYS: z.coerce.number().int().default(730),

  // Request body limits
  REQUEST_BODY_LIMIT: z.string().default('1mb'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Format errors clearly before crashing
  const issues = parsed.error.issues
    .map((i) => `  • [${i.path.join('.')}] ${i.message}`)
    .join('\n');
  process.stderr.write(`\n❌  Environment configuration is invalid:\n${issues}\n`);
  process.exit(1);
}

const env = parsed.data;

// ---------------------------------------------------------------------------
// Derived / computed config values
// ---------------------------------------------------------------------------

export const config = {
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',
  isStaging: env.NODE_ENV === 'staging',
  isTest: env.NODE_ENV === 'test',
  port: env.PORT,

  db: {
    uri: env.MONGODB_URI,
  },

  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
    refreshSecret: env.JWT_REFRESH_SECRET,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },

  cookie: {
    secret: env.COOKIE_SECRET,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    refreshPath: env.REFRESH_COOKIE_PATH,
  },

  cors: {
    origins: env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
  },

  argon2: {
    memoryCost: env.ARGON2_MEMORY_COST,
    timeCost: env.ARGON2_TIME_COST,
    parallelism: env.ARGON2_PARALLELISM,
  },

  otp: {
    expiresMinutes: env.OTP_EXPIRES_MINUTES,
    maxAttempts: env.OTP_MAX_ATTEMPTS,
    resendCooldownSeconds: env.OTP_RESEND_COOLDOWN_SECONDS,
    maxResends: env.OTP_MAX_RESENDS,
  },

  email: {
    provider: env.EMAIL_PROVIDER,
    from: { address: env.EMAIL_FROM_ADDRESS, name: env.EMAIL_FROM_NAME },
    sendgrid: { apiKey: env.SENDGRID_API_KEY },
    smtp: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    ses: { region: env.SES_REGION },
  },

  cloudinary: {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
  },

  razorpay: {
    keyId: env.RAZORPAY_KEY_ID,
    keySecret: env.RAZORPAY_KEY_SECRET,
    webhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
  },

  storage: {
    provider: env.STORAGE_PROVIDER,
    localDir: env.STORAGE_LOCAL_DIR,
    s3: {
      bucket: env.S3_BUCKET,
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  },

  rateLimit: {
    global: { max: env.RATE_LIMIT_GLOBAL_MAX, windowMs: env.RATE_LIMIT_GLOBAL_WINDOW_MS },
    auth: { max: env.RATE_LIMIT_AUTH_MAX, windowMs: env.RATE_LIMIT_AUTH_WINDOW_MS },
    otp: { max: env.RATE_LIMIT_OTP_MAX, windowMs: env.RATE_LIMIT_OTP_WINDOW_MS },
    search: { max: env.RATE_LIMIT_SEARCH_MAX, windowMs: env.RATE_LIMIT_SEARCH_WINDOW_MS },
    upload: { max: env.RATE_LIMIT_UPLOAD_MAX, windowMs: env.RATE_LIMIT_UPLOAD_WINDOW_MS },
  },

  retention: {
    notificationDays: env.NOTIFICATION_RETENTION_DAYS,
    analyticsRawDays: env.ANALYTICS_RAW_RETENTION_DAYS,
    auditLogDays: env.AUDIT_LOG_RETENTION_DAYS,
  },

  request: {
    bodyLimit: env.REQUEST_BODY_LIMIT,
  },

  logging: {
    level: env.LOG_LEVEL,
  },
};
