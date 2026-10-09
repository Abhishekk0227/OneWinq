import { z } from 'zod';
import { ORGANIZATION_TYPE, ORGANIZATION_STATUS } from '../../config/constants.js';
import { ValidationError } from '../../shared/errors.js';

export const createOrganizationSchema = z.object({
  name: z
    .string({ required_error: 'Organization name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(120, 'Name cannot exceed 120 characters'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, 'Slug must be at least 2 characters')
    .max(80, 'Slug cannot exceed 80 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens')
    .optional(),
  type: z.enum(Object.values(ORGANIZATION_TYPE)).default(ORGANIZATION_TYPE.COMPANY),
  tagline: z.string().trim().max(200, 'Tagline cannot exceed 200 characters').default(''),
  description: z.string().trim().max(5000, 'Description cannot exceed 5000 characters').default(''),
  logoUrl: z.string().url().nullable().optional(),
  bannerUrl: z.string().url().nullable().optional(),
  website: z.string().url().or(z.literal('')).default(''),
  industry: z.string().trim().max(80).default(''),
  size: z.string().trim().default('1-10'),
  foundedYear: z.coerce.number().int().min(1800).max(2100).nullable().optional(),
  location: z
    .object({
      address: z.string().trim().default(''),
      city: z.string().trim().default(''),
      state: z.string().trim().default(''),
      country: z.string().trim().default(''),
      isRemoteFriendly: z.boolean().default(false),
    })
    .default({}),
  contactEmail: z.string().email().or(z.literal('')).default(''),
  contactPhone: z.string().trim().default(''),
  socialLinks: z
    .array(
      z.object({
        platform: z.string().trim().min(1),
        url: z.string().url(),
      }),
    )
    .default([]),
  settings: z
    .object({
      allowMemberJobPosting: z.boolean().default(false),
      requireApprovalForCards: z.boolean().default(true),
      isPublicDirectory: z.boolean().default(true),
      defaultTemplateId: z.string().nullable().optional(),
    })
    .default({}),
});

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens')
    .optional(),
  type: z.enum(Object.values(ORGANIZATION_TYPE)).optional(),
  status: z.enum(Object.values(ORGANIZATION_STATUS)).optional(),
  tagline: z.string().trim().max(200).optional(),
  description: z.string().trim().max(5000).optional(),
  logoUrl: z.string().url().nullable().optional(),
  bannerUrl: z.string().url().nullable().optional(),
  website: z.string().url().or(z.literal('')).optional(),
  industry: z.string().trim().max(80).optional(),
  size: z.string().trim().optional(),
  foundedYear: z.coerce.number().int().min(1800).max(2100).nullable().optional(),
  location: z
    .object({
      address: z.string().trim().default(''),
      city: z.string().trim().default(''),
      state: z.string().trim().default(''),
      country: z.string().trim().default(''),
      isRemoteFriendly: z.boolean().default(false),
    })
    .optional(),
  contactEmail: z.string().email().or(z.literal('')).optional(),
  contactPhone: z.string().trim().optional(),
  socialLinks: z
    .array(
      z.object({
        platform: z.string().trim().min(1),
        url: z.string().url(),
      }),
    )
    .optional(),
  settings: z
    .object({
      allowMemberJobPosting: z.boolean().optional(),
      requireApprovalForCards: z.boolean().optional(),
      isPublicDirectory: z.boolean().optional(),
      defaultTemplateId: z.string().nullable().optional(),
    })
    .optional(),
});

export const listOrganizationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().optional(),
  type: z.enum(Object.values(ORGANIZATION_TYPE)).optional(),
  industry: z.string().trim().optional(),
  isVerified: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  status: z.enum(Object.values(ORGANIZATION_STATUS)).default(ORGANIZATION_STATUS.ACTIVE),
});

export function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = Object.fromEntries(
      result.error.issues.map((issue) => [issue.path.join('.'), issue.message]),
    );
    throw new ValidationError('Validation failed', details);
  }
  return result.data;
}

export function validateBody(schema) {
  return (req, _res, next) => {
    try {
      req.body = validate(schema, req.body);
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function validateQuery(schema) {
  return (req, _res, next) => {
    try {
      req.query = validate(schema, req.query);
      next();
    } catch (err) {
      next(err);
    }
  };
}
