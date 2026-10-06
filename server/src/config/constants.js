// ---------------------------------------------------------------------------
// Application-wide constants.
// Never import from env.js here — keep this file pure constants.
// ---------------------------------------------------------------------------

// ---- Account states --------------------------------------------------------
export const ACCOUNT_STATE = Object.freeze({
  ACTIVE: 'ACTIVE',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  DEACTIVATED: 'DEACTIVATED',
  SUSPENDED: 'SUSPENDED',
  DELETION_PENDING: 'DELETION_PENDING',
  PERMANENTLY_DELETED: 'PERMANENTLY_DELETED',
});

// ---- Profile states --------------------------------------------------------
export const PROFILE_STATE = Object.freeze({
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
});

// ---- Profile visibility modes ----------------------------------------------
export const VISIBILITY_MODE = Object.freeze({
  PUBLIC: 'PUBLIC',
  PROFESSIONAL: 'PROFESSIONAL',
  PRIVATE: 'PRIVATE',
});

// ---- Section / field visibility --------------------------------------------
export const SECTION_VISIBILITY = Object.freeze({
  PUBLIC: 'PUBLIC',
  PROFESSIONAL: 'PROFESSIONAL',
  PRIVATE: 'PRIVATE',
});

// ---- Temporary mode durations (ms) -----------------------------------------
export const TEMP_MODE_DURATION = Object.freeze({
  ONE_HOUR: 60 * 60 * 1000,
  SIX_HOURS: 6 * 60 * 60 * 1000,
  TWENTY_FOUR_HOURS: 24 * 60 * 60 * 1000,
  SEVEN_DAYS: 7 * 24 * 60 * 60 * 1000,
});

// ---- Connection states -----------------------------------------------------
export const CONNECTION_STATE = Object.freeze({
  NONE: 'NONE',
  PENDING_SENT: 'PENDING_SENT',
  PENDING_RECEIVED: 'PENDING_RECEIVED',
  CONNECTED: 'CONNECTED',
  BLOCKED: 'BLOCKED',
});

// ---- Connection request visibility -----------------------------------------
export const CONNECTION_REQUEST_VISIBILITY = Object.freeze({
  EVERYONE: 'EVERYONE',
  NOBODY: 'NOBODY',
});

// ---- Card lifecycle --------------------------------------------------------
export const CARD_STATE = Object.freeze({
  UNASSIGNED: 'UNASSIGNED',
  RESERVED: 'RESERVED',
  ASSIGNED: 'ASSIGNED',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  BLOCKED: 'BLOCKED',
  LOST: 'LOST',
  REPLACED: 'REPLACED',
});

// ---- Card Transfer lifecycle -----------------------------------------------
export const CARD_TRANSFER_STATUS = Object.freeze({
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
});

// ---- Order lifecycle -------------------------------------------------------
export const ORDER_STATE = Object.freeze({
  CREATED: 'CREATED',
  PAID: 'PAID',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
});

// ---- Payment types --------------------------------------------------------
export const PAYMENT_TYPE = Object.freeze({
  ONE_TIME: 'ONE_TIME',
  SUBSCRIPTION: 'SUBSCRIPTION',
});

// ---- Subscription tiers & statuses ----------------------------------------
export const PLAN_TIER = Object.freeze({
  FREE: 'FREE',
  PRO: 'PRO',
  BUSINESS: 'BUSINESS',
  ENTERPRISE: 'ENTERPRISE',
});

export const BILLING_CYCLE = Object.freeze({
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY',
});

export const SUBSCRIPTION_STATUS = Object.freeze({
  INCOMPLETE: 'INCOMPLETE',
  TRIALING: 'TRIALING',
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'PAST_DUE',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
});

export const SUBSCRIPTION_GATEWAY = Object.freeze({
  RAZORPAY: 'RAZORPAY',
  MANUAL: 'MANUAL',
  SYSTEM: 'SYSTEM',
});

export const FEATURE_FLAG = Object.freeze({
  ADVANCED_ANALYTICS: 'ADVANCED_ANALYTICS',
  CUSTOM_SLUG: 'CUSTOM_SLUG',
  REMOVE_BRANDING: 'REMOVE_BRANDING',
  CUSTOM_THEMES: 'CUSTOM_THEMES',
  EXPORT_ANALYTICS: 'EXPORT_ANALYTICS',
  PRIORITY_DISCOVERY: 'PRIORITY_DISCOVERY',
  TEAM_MEMBERS: 'TEAM_MEMBERS',
});

export const DEFAULT_PLAN_LIMITS = Object.freeze({
  FREE: {
    maxProfiles: 1,
    maxCards: 1,
    analyticsRetentionDays: 7,
    features: [],
  },
  PRO: {
    maxProfiles: 3,
    maxCards: 5,
    analyticsRetentionDays: 90,
    features: [
      'ADVANCED_ANALYTICS',
      'CUSTOM_SLUG',
      'REMOVE_BRANDING',
      'PRIORITY_DISCOVERY',
    ],
  },
  BUSINESS: {
    maxProfiles: 999999,
    maxCards: 25,
    analyticsRetentionDays: 365,
    features: [
      'ADVANCED_ANALYTICS',
      'CUSTOM_SLUG',
      'REMOVE_BRANDING',
      'CUSTOM_THEMES',
      'EXPORT_ANALYTICS',
      'PRIORITY_DISCOVERY',
      'TEAM_MEMBERS',
    ],
  },
  ENTERPRISE: {
    maxProfiles: 999999,
    maxCards: 999999,
    analyticsRetentionDays: 730,
    features: [
      'ADVANCED_ANALYTICS',
      'CUSTOM_SLUG',
      'REMOVE_BRANDING',
      'CUSTOM_THEMES',
      'EXPORT_ANALYTICS',
      'PRIORITY_DISCOVERY',
      'TEAM_MEMBERS',
    ],
  },
});

// ---- Entitlement capabilities ---------------------------------------------
export const ENTITLEMENT_CAPABILITY = Object.freeze({
  ADVANCED_ANALYTICS: 'ADVANCED_ANALYTICS',
  ADVANCED_PROFILE_CUSTOMIZATION: 'ADVANCED_PROFILE_CUSTOMIZATION',
  CUSTOM_THEMES: 'CUSTOM_THEMES',
  TIMED_MODES: 'TIMED_MODES',
  ADDITIONAL_PROFESSIONAL_IDENTITIES: 'ADDITIONAL_PROFESSIONAL_IDENTITIES',
});

// ---- Notification types ----------------------------------------------------
export const NOTIFICATION_TYPE = Object.freeze({
  CONNECTION_REQUEST: 'CONNECTION_REQUEST',
  CONNECTION_ACCEPTED: 'CONNECTION_ACCEPTED',
  NEW_MESSAGE: 'NEW_MESSAGE',
  PROFILE_VIEW: 'PROFILE_VIEW',
  CARD_ACTIVATED: 'CARD_ACTIVATED',
  CARD_TRANSFER_REQUEST: 'CARD_TRANSFER_REQUEST',
  CARD_TRANSFER_RESULT: 'CARD_TRANSFER_RESULT',
  ORDER_UPDATE: 'ORDER_UPDATE',
  SUBSCRIPTION_UPDATE: 'SUBSCRIPTION_UPDATE',
  REPORT_RESPONSE: 'REPORT_RESPONSE',
  TICKET_RESPONSE: 'TICKET_RESPONSE',
  POST_LIKE: 'POST_LIKE',
  POST_COMMENT: 'POST_COMMENT',
  SYSTEM_ANNOUNCEMENT: 'SYSTEM_ANNOUNCEMENT',
  SECURITY_ALERT: 'SECURITY_ALERT',
});

// ---- Report lifecycle & categories -----------------------------------------
export const REPORT_STATE = Object.freeze({
  OPEN: 'OPEN',
  UNDER_REVIEW: 'UNDER_REVIEW',
  RESOLVED: 'RESOLVED',
  DISMISSED: 'DISMISSED',
});

export const REPORT_TARGET_TYPE = Object.freeze({
  PROFILE: 'PROFILE',
  MESSAGE: 'MESSAGE',
  CARD: 'CARD',
});

export const REPORT_REASON = Object.freeze({
  SPAM: 'SPAM',
  HARASSMENT: 'HARASSMENT',
  INAPPROPRIATE_CONTENT: 'INAPPROPRIATE_CONTENT',
  IMPERSONATION: 'IMPERSONATION',
  SCAM_FRAUD: 'SCAM_FRAUD',
  COPYRIGHT: 'COPYRIGHT',
  OTHER: 'OTHER',
});

export const REPORT_ACTION = Object.freeze({
  NONE: 'NONE',
  WARNING_SENT: 'WARNING_SENT',
  CONTENT_REMOVED: 'CONTENT_REMOVED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  ACCOUNT_BANNED: 'ACCOUNT_BANNED',
});

// ---- Support ticket states & priorities ------------------------------------
export const TICKET_STATE = Object.freeze({
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  WAITING_FOR_USER: 'WAITING_FOR_USER',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
});

export const TICKET_CATEGORY = Object.freeze({
  ACCOUNT: 'ACCOUNT',
  BILLING_SUBSCRIPTION: 'BILLING_SUBSCRIPTION',
  NFC_HARDWARE: 'NFC_HARDWARE',
  TECHNICAL_ISSUE: 'TECHNICAL_ISSUE',
  FEATURE_REQUEST: 'FEATURE_REQUEST',
  OTHER: 'OTHER',
});

export const TICKET_PRIORITY = Object.freeze({
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
});

// ---- OTP purposes ----------------------------------------------------------
export const OTP_PURPOSE = Object.freeze({
  EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
  PASSWORD_RESET: 'PASSWORD_RESET',
  EMAIL_CHANGE: 'EMAIL_CHANGE',
  USERNAME_CHANGE: 'USERNAME_CHANGE',
  ACCOUNT_DELETION: 'ACCOUNT_DELETION',
});

// ---- Session types ---------------------------------------------------------
export const SESSION_TYPE = Object.freeze({
  WEB: 'WEB',
  MOBILE: 'MOBILE',
  API: 'API',
});

// ---- Data classification ---------------------------------------------------
export const DATA_CLASS = Object.freeze({
  PUBLIC: 'PUBLIC',
  PRIVATE: 'PRIVATE',
  SENSITIVE: 'SENSITIVE',
  SECURITY: 'SECURITY',
  FINANCIAL: 'FINANCIAL',
  INTERNAL: 'INTERNAL',
});

// ---- Privacy, export & deletion states -------------------------------------
export const DATA_EXPORT_STATUS = Object.freeze({
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  READY: 'READY',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED',
});

export const DELETION_REQUEST_STATUS = Object.freeze({
  PENDING: 'PENDING',
  CANCELLED: 'CANCELLED',
  EXECUTED: 'EXECUTED',
});

// ---- Media purposes --------------------------------------------------------
export const MEDIA_PURPOSE = Object.freeze({
  PROFILE_PHOTO: 'PROFILE_PHOTO',
  PROFILE_COVER: 'PROFILE_COVER',
  PROFILE_SECTION: 'PROFILE_SECTION',
  MESSAGE_ATTACHMENT: 'MESSAGE_ATTACHMENT',
  CARD_MEDIA: 'CARD_MEDIA',
  SUPPORT_EVIDENCE: 'SUPPORT_EVIDENCE',
  REPORT_EVIDENCE: 'REPORT_EVIDENCE',
  POST_MEDIA: 'POST_MEDIA',
  PRIVATE_DOCUMENT: 'PRIVATE_DOCUMENT',
});

// ---- Posts & Comments lifecycle --------------------------------------------
export const POST_STATE = Object.freeze({
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
  DELETED: 'DELETED',
});

export const COMMENT_STATE = Object.freeze({
  ACTIVE: 'ACTIVE',
  DELETED: 'DELETED',
});

// ---- Email categories ------------------------------------------------------
export const EMAIL_CATEGORY = Object.freeze({
  TRANSACTIONAL: 'TRANSACTIONAL',
  SECURITY: 'SECURITY',
  MARKETING: 'MARKETING',
});

// ---- Admin roles -----------------------------------------------------------
export const ADMIN_ROLE = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  SUPPORT: 'SUPPORT',
});

// ---- Internal events -------------------------------------------------------
export const APP_EVENT = Object.freeze({
  USER_REGISTERED: 'user.registered',
  USER_VERIFIED: 'user.verified',
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_PASSWORD_CHANGED: 'user.passwordChanged',
  USER_EMAIL_CHANGED: 'user.emailChanged',
  USER_SUSPENDED: 'user.suspended',
  USER_DELETION_REQUESTED: 'user.deletionRequested',

  CONNECTION_REQUEST_SENT: 'connection.requestSent',
  CONNECTION_ACCEPTED: 'connection.accepted',
  CONNECTION_REJECTED: 'connection.rejected',
  CONNECTION_REMOVED: 'connection.removed',
  USER_BLOCKED: 'user.blocked',

  MESSAGE_SENT: 'message.sent',
  MESSAGE_EDITED: 'message.edited',
  MESSAGE_DELETED: 'message.deleted',
  MESSAGE_READ: 'message.read',

  NOTIFICATION_CREATED: 'notification.created',

  PROFILE_VIEWED: 'profile.viewed',
  QR_SCANNED: 'qr.scanned',
  CARD_TAPPED: 'card.tapped',
  CARD_ACTIVATED: 'card.activated',
  CARD_TRANSFER_REQUESTED: 'card.transferRequested',
  CARD_TRANSFER_ACCEPTED: 'card.transferAccepted',
  CARD_TRANSFER_REJECTED: 'card.transferRejected',
  CARD_TRANSFER_CANCELLED: 'card.transferCancelled',
  CARD_TRANSFERRED: 'card.transferred',

  ORDER_CREATED: 'order.created',
  ORDER_PAID: 'order.paid',
  ORDER_SHIPPED: 'order.shipped',
  ORDER_DELIVERED: 'order.delivered',
  ORDER_STATUS_CHANGED: 'order.statusChanged',

  POST_LIKED: 'post.liked',
  POST_COMMENTED: 'post.commented',

  PAYMENT_SUCCESS: 'payment.success',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',

  SUBSCRIPTION_ACTIVATED: 'subscription.activated',
  SUBSCRIPTION_RENEWED: 'subscription.renewed',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
  SUBSCRIPTION_PAST_DUE: 'subscription.pastDue',
  SUBSCRIPTION_EXPIRED: 'subscription.expired',

  REPORT_CREATED: 'report.created',
  REPORT_RESOLVED: 'report.resolved',

  TICKET_CREATED: 'ticket.created',
  TICKET_REPLIED: 'ticket.replied',
  TICKET_CLOSED: 'ticket.closed',

  DATA_EXPORT_REQUESTED: 'data.exportRequested',
  DATA_EXPORT_COMPLETED: 'data.exportCompleted',
  ACCOUNT_DELETION_SCHEDULED: 'user.deletionScheduled',
  ACCOUNT_DELETION_CANCELLED: 'user.deletionCancelled',
  ACCOUNT_PERMANENTLY_DELETED: 'user.permanentlyDeleted',

  ENTITLEMENT_GRANTED: 'entitlement.granted',
  ENTITLEMENT_REVOKED: 'entitlement.revoked',
});

// ---- HTTP status codes (reference) -----------------------------------------
export const HTTP = Object.freeze({
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL: 500,
  SERVICE_UNAVAILABLE: 503,
});

// ---- Error codes -----------------------------------------------------------
export const ERROR_CODE = Object.freeze({
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  ACCOUNT_DEACTIVATED: 'ACCOUNT_DEACTIVATED',
  ACCOUNT_PENDING_VERIFICATION: 'ACCOUNT_PENDING_VERIFICATION',
  ACCOUNT_DELETION_PENDING: 'ACCOUNT_DELETION_PENDING',
  OTP_INVALID: 'OTP_INVALID',
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_MAX_ATTEMPTS: 'OTP_MAX_ATTEMPTS',
  OTP_COOLDOWN: 'OTP_COOLDOWN',
  OTP_MAX_RESENDS: 'OTP_MAX_RESENDS',
  SESSION_INVALID: 'SESSION_INVALID',
  REUSE_DETECTED: 'REUSE_DETECTED',
  ENTITLEMENT_REQUIRED: 'ENTITLEMENT_REQUIRED',
  PLAN_UPGRADE_REQUIRED: 'PLAN_UPGRADE_REQUIRED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  WEBHOOK_INVALID: 'WEBHOOK_INVALID',
  MEDIA_TYPE_INVALID: 'MEDIA_TYPE_INVALID',
  MEDIA_SIZE_EXCEEDED: 'MEDIA_SIZE_EXCEEDED',
  USERNAME_TAKEN: 'USERNAME_TAKEN',
  USERNAME_RESERVED: 'USERNAME_RESERVED',
  USERNAME_COOLDOWN: 'USERNAME_COOLDOWN',
});

// ---- Username constraints --------------------------------------------------
export const USERNAME = Object.freeze({
  MIN_LENGTH: 3,
  MAX_LENGTH: 30,
  PATTERN: /^[a-z0-9-]+$/,
  CHANGE_COOLDOWN_DAYS: 30,
});

// ---- Password constraints --------------------------------------------------
export const PASSWORD = Object.freeze({
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
});

// ---- Profile view dedup window (ms) ----------------------------------------
export const PROFILE_VIEW_DEDUP_MS = 30 * 60 * 1000; // 30 minutes
