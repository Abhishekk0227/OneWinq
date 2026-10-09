/**
 * Application-wide constants and enums mirroring the OneWinq server contracts.
 */

export const ACCOUNT_STATE = {
  ACTIVE: 'ACTIVE',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  DEACTIVATED: 'DEACTIVATED',
  SUSPENDED: 'SUSPENDED',
  DELETION_PENDING: 'DELETION_PENDING',
  PERMANENTLY_DELETED: 'PERMANENTLY_DELETED',
} as const
export type AccountState = typeof ACCOUNT_STATE[keyof typeof ACCOUNT_STATE]

export const VISIBILITY_MODE = {
  PUBLIC: 'PUBLIC',
  PROFESSIONAL: 'PROFESSIONAL',
  PRIVATE: 'PRIVATE',
} as const
export type VisibilityMode = typeof VISIBILITY_MODE[keyof typeof VISIBILITY_MODE]

export const SECTION_VISIBILITY = {
  PUBLIC: 'PUBLIC',
  PROFESSIONAL: 'PROFESSIONAL',
  PRIVATE: 'PRIVATE',
} as const
export type SectionVisibility = typeof SECTION_VISIBILITY[keyof typeof SECTION_VISIBILITY]

export const PROFILE_STATE = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
} as const
export type ProfileState = typeof PROFILE_STATE[keyof typeof PROFILE_STATE]

export const CONNECTION_STATE = {
  NONE: 'NONE',
  PENDING_SENT: 'PENDING_SENT',
  PENDING_RECEIVED: 'PENDING_RECEIVED',
  CONNECTED: 'CONNECTED',
  BLOCKED: 'BLOCKED',
} as const
export type ConnectionState = typeof CONNECTION_STATE[keyof typeof CONNECTION_STATE]

export const CARD_STATE = {
  UNASSIGNED: 'UNASSIGNED',
  RESERVED: 'RESERVED',
  ASSIGNED: 'ASSIGNED',
  ACTIVE: 'ACTIVE',
  BLOCKED: 'BLOCKED',
  LOST: 'LOST',
  REPLACED: 'REPLACED',
} as const
export type CardState = typeof CARD_STATE[keyof typeof CARD_STATE]

export const ORDER_STATE = {
  CREATED: 'CREATED',
  PAID: 'PAID',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const
export type OrderState = typeof ORDER_STATE[keyof typeof ORDER_STATE]

export const PLAN_TIER = {
  FREE: 'FREE',
  PRO: 'PRO',
  BUSINESS: 'BUSINESS',
  ENTERPRISE: 'ENTERPRISE',
} as const
export type PlanTier = typeof PLAN_TIER[keyof typeof PLAN_TIER]

export const ADMIN_ROLE = {
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
  SUPPORT: 'SUPPORT',
  USER: 'USER',
} as const
export type AdminRole = typeof ADMIN_ROLE[keyof typeof ADMIN_ROLE]

export const NOTIFICATION_TYPE = {
  CONNECTION_REQUEST: 'CONNECTION_REQUEST',
  CONNECTION_ACCEPTED: 'CONNECTION_ACCEPTED',
  NEW_MESSAGE: 'NEW_MESSAGE',
  PROFILE_VIEW: 'PROFILE_VIEW',
  CARD_ACTIVATED: 'CARD_ACTIVATED',
  ORDER_UPDATE: 'ORDER_UPDATE',
  SUBSCRIPTION_UPDATE: 'SUBSCRIPTION_UPDATE',
  SYSTEM_ANNOUNCEMENT: 'SYSTEM_ANNOUNCEMENT',
  SECURITY_ALERT: 'SECURITY_ALERT',
  REPORT_RESPONSE: 'REPORT_RESPONSE',
  TICKET_RESPONSE: 'TICKET_RESPONSE',
  POST_LIKE: 'POST_LIKE',
  POST_COMMENT: 'POST_COMMENT',
} as const
export type NotificationType = typeof NOTIFICATION_TYPE[keyof typeof NOTIFICATION_TYPE]

export const ORGANIZATION_TYPE = {
  COMPANY: 'COMPANY',
  STARTUP: 'STARTUP',
  COLLEGE: 'COLLEGE',
  UNIVERSITY: 'UNIVERSITY',
  HOSPITAL: 'HOSPITAL',
  NGO: 'NGO',
  OTHER: 'OTHER',
} as const
export type OrganizationType = typeof ORGANIZATION_TYPE[keyof typeof ORGANIZATION_TYPE]

export const ORGANIZATION_STATUS = {
  ACTIVE: 'ACTIVE',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  SUSPENDED: 'SUSPENDED',
  DEACTIVATED: 'DEACTIVATED',
} as const
export type OrganizationStatus = typeof ORGANIZATION_STATUS[keyof typeof ORGANIZATION_STATUS]

export const ORGANIZATION_ROLE = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  HR_MANAGER: 'HR_MANAGER',
  MANAGER: 'MANAGER',
  MEMBER: 'MEMBER',
} as const
export type OrganizationRole = typeof ORGANIZATION_ROLE[keyof typeof ORGANIZATION_ROLE]

export const JOB_STATUS = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  CLOSED: 'CLOSED',
  ARCHIVED: 'ARCHIVED',
} as const
export type JobStatus = typeof JOB_STATUS[keyof typeof JOB_STATUS]

export const EMPLOYMENT_TYPE = {
  FULL_TIME: 'FULL_TIME',
  PART_TIME: 'PART_TIME',
  CONTRACT: 'CONTRACT',
  INTERNSHIP: 'INTERNSHIP',
} as const
export type EmploymentType = typeof EMPLOYMENT_TYPE[keyof typeof EMPLOYMENT_TYPE]

export const WORKPLACE_TYPE = {
  ON_SITE: 'ON_SITE',
  HYBRID: 'HYBRID',
  REMOTE: 'REMOTE',
} as const
export type WorkplaceType = typeof WORKPLACE_TYPE[keyof typeof WORKPLACE_TYPE]

export const APPLICATION_STATUS = {
  SUBMITTED: 'SUBMITTED',
  IN_REVIEW: 'IN_REVIEW',
  SHORTLISTED: 'SHORTLISTED',
  INTERVIEW_SCHEDULED: 'INTERVIEW_SCHEDULED',
  OFFERED: 'OFFERED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
} as const
export type ApplicationStatus = typeof APPLICATION_STATUS[keyof typeof APPLICATION_STATUS]

export const PROFILE_APPROVAL_STATUS = {
  DRAFT: 'DRAFT',
  PENDING_REVIEW: 'PENDING_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CHANGES_REQUESTED: 'CHANGES_REQUESTED',
} as const
export type ProfileApprovalStatus = typeof PROFILE_APPROVAL_STATUS[keyof typeof PROFILE_APPROVAL_STATUS]

export const EVENT_STATUS = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
} as const
export type EventStatus = typeof EVENT_STATUS[keyof typeof EVENT_STATUS]

export const EVENT_ELIGIBILITY_TYPE = {
  ALL: 'ALL',
  DEPARTMENTS: 'DEPARTMENTS',
  ROLES: 'ROLES',
} as const
export type EventEligibilityType = typeof EVENT_ELIGIBILITY_TYPE[keyof typeof EVENT_ELIGIBILITY_TYPE]

export const EVENT_REGISTRATION_STATUS = {
  REGISTERED: 'REGISTERED',
  CHECKED_IN: 'CHECKED_IN',
  CANCELLED: 'CANCELLED',
} as const
export type EventRegistrationStatus = typeof EVENT_REGISTRATION_STATUS[keyof typeof EVENT_REGISTRATION_STATUS]

export const ORGANIZATION_PERMISSION = {
  ORG_EDIT: 'org:edit',
  ORG_DELETE: 'org:delete',
  MEMBERS_VIEW: 'members:view',
  MEMBERS_INVITE: 'members:invite',
  MEMBERS_EDIT: 'members:edit',
  MEMBERS_REMOVE: 'members:remove',
  DEPARTMENTS_MANAGE: 'departments:manage',
  JOBS_VIEW: 'jobs:view',
  JOBS_CREATE: 'jobs:create',
  JOBS_EDIT: 'jobs:edit',
  JOBS_DELETE: 'jobs:delete',
  APPLICATIONS_VIEW: 'applications:view',
  APPLICATIONS_MANAGE: 'applications:manage',
  CARDS_MANAGE: 'cards:manage',
  EVENTS_VIEW: 'events:view',
  EVENTS_MANAGE: 'events:manage',
  APPROVALS_VIEW: 'approvals:view',
  APPROVALS_MANAGE: 'approvals:manage',
  ROLES_VIEW: 'roles:view',
  ROLES_MANAGE: 'roles:manage',
  SETTINGS_MANAGE: 'settings:manage',
  SHOWCASE_MANAGE: 'showcase:manage',
  ANALYTICS_VIEW: 'analytics:view',
  AUDIT_VIEW: 'audit:view',
} as const
export type OrganizationPermission = typeof ORGANIZATION_PERMISSION[keyof typeof ORGANIZATION_PERMISSION]


