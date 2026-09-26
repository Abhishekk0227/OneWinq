import { z } from 'zod';
import { VISIBILITY_MODE, SECTION_VISIBILITY, USERNAME } from '../../config/constants.js';
import { ValidationError } from '../../shared/errors.js';

function sanitizeText(val) {
  if (typeof val !== 'string') {return val;}
  return val.replace(/<[^>]*>?/gm, '').trim();
}

function normalizeUrlString(val) {
  if (!val || typeof val !== 'string') return '';
  const trimmed = val.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function normalizeSocialLink(link) {
  if (!link || !link.url || typeof link.url !== 'string') return null;
  const rawUrl = link.url.trim();
  if (!rawUrl) return null;

  const clean = rawUrl.replace(/^@/, '');
  let finalUrl = clean;

  if (!/^https?:\/\//i.test(clean)) {
    if (!clean.includes('.')) {
      const p = (link.platform || '').toLowerCase();
      if (p.includes('linkedin')) finalUrl = `https://linkedin.com/in/${clean}`;
      else if (p.includes('github')) finalUrl = `https://github.com/${clean}`;
      else if (p === 'x' || p.includes('twitter')) finalUrl = `https://x.com/${clean}`;
      else if (p.includes('instagram')) finalUrl = `https://instagram.com/${clean}`;
      else if (p.includes('youtube')) finalUrl = `https://youtube.com/@${clean}`;
      else if (p.includes('dribbble')) finalUrl = `https://dribbble.com/${clean}`;
      else if (p.includes('behance')) finalUrl = `https://behance.net/${clean}`;
      else if (p.includes('medium')) finalUrl = `https://medium.com/@${clean}`;
      else finalUrl = `https://${clean}.com`;
    } else {
      finalUrl = `https://${clean}`;
    }
  }

  try {
    new URL(finalUrl);
  } catch {
    return null;
  }

  return {
    id: link.id,
    platform: link.platform || 'Website',
    url: finalUrl,
    label: link.label || link.platform || '',
  };
}

const monthSchema = z.coerce.number().int().min(1).max(12).nullable().optional();
const yearSchema = z.coerce.number().int().min(1900).max(2100).nullable().optional();

export const updateProfileSchema = z.object({
  personaId: z.string().optional(),
  personaName: z.string().max(100).optional().transform(sanitizeText),
  professionTitle: z.string().max(100).optional().transform(sanitizeText),
  templateSlug: z.string().max(50).optional(),
  templateId: z.string().optional(),
  displayName: z
    .string()
    .min(1, 'Display name cannot be empty')
    .max(100, 'Display name cannot exceed 100 characters')
    .optional()
    .transform(sanitizeText),
  headline: z.string().max(160, 'Headline cannot exceed 160 characters').optional().transform(sanitizeText),
  bio: z.string().max(2000, 'Bio cannot exceed 2000 characters').optional().transform(sanitizeText),
  avatarUrl: z.string().max(2000).nullable().optional(),
  coverUrl: z.string().max(2000).nullable().optional(),
  location: z
    .object({
      city: z.string().max(100).optional().transform(sanitizeText),
      state: z.string().max(100).optional().transform(sanitizeText),
      country: z.string().max(100).optional().transform(sanitizeText),
      isRemote: z.boolean().optional(),
    })
    .optional(),
  contact: z
    .object({
      email: z.string().email().optional().or(z.literal('')),
      phone: z.string().max(30).optional().transform(sanitizeText),
      website: z
        .string()
        .optional()
        .transform((val) => normalizeUrlString(val)),
      address: z.string().max(200).optional().transform(sanitizeText),
    })
    .optional(),
  socialLinks: z
    .array(
      z.object({
        id: z.string().optional(),
        platform: z.string().max(50).optional().default('Website'),
        url: z.string().default(''),
        label: z.string().max(50).optional().default(''),
      }),
    )
    .optional()
    .transform((links) => {
      if (!Array.isArray(links)) return [];
      return links.map(normalizeSocialLink).filter(Boolean);
    }),
  education: z
    .array(
      z.object({
        id: z.string().optional(),
        institution: z.string().min(1).max(150),
        degree: z.string().max(100).optional().default(''),
        fieldOfStudy: z.string().max(100).optional().default(''),
        startMonth: monthSchema,
        startYear: yearSchema,
        endMonth: monthSchema,
        endYear: yearSchema,
        startDate: z.coerce.date().nullable().optional(),
        endDate: z.coerce.date().nullable().optional(),
        current: z.boolean().optional().default(false),
        description: z.string().max(1000).optional().default(''),
      }),
    )
    .optional(),
  experience: z
    .array(
      z.object({
        id: z.string().optional(),
        company: z.string().min(1).max(150),
        role: z.string().min(1).max(100),
        location: z.string().max(100).optional().default(''),
        startMonth: monthSchema,
        startYear: yearSchema,
        endMonth: monthSchema,
        endYear: yearSchema,
        startDate: z.coerce.date().nullable().optional(),
        endDate: z.coerce.date().nullable().optional(),
        current: z.boolean().optional().default(false),
        description: z.string().max(1500).optional().default(''),
      }),
    )
    .optional(),
  skills: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1).max(50),
        category: z.string().max(50).optional().default(''),
        proficiency: z.string().max(50).optional().default(''),
      }),
    )
    .optional(),
  projects: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().min(1).max(150),
        description: z.string().max(1500).optional().default(''),
        url: z.string().url().optional().or(z.literal('')),
        mediaUrls: z.array(z.string().url()).optional().default([]),
        startMonth: monthSchema,
        startYear: yearSchema,
        endMonth: monthSchema,
        endYear: yearSchema,
        startDate: z.coerce.date().nullable().optional(),
        endDate: z.coerce.date().nullable().optional(),
        current: z.boolean().optional().default(false),
      }),
    )
    .optional(),
  certifications: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1).max(150),
        issuer: z.string().min(1).max(100),
        issueMonth: monthSchema,
        issueYear: yearSchema,
        expiryMonth: monthSchema,
        expiryYear: yearSchema,
        issueDate: z.coerce.date().nullable().optional(),
        expiryDate: z.coerce.date().nullable().optional(),
        doesNotExpire: z.boolean().optional().default(false),
        credentialId: z.string().max(100).optional().default(''),
        url: z.string().url().optional().or(z.literal('')),
      }),
    )
    .optional(),
  services: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().min(1).max(150),
        description: z.string().max(1000).optional().default(''),
        priceRange: z.string().max(50).optional().default(''),
      }),
    )
    .optional(),
  awards: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().min(1).max(150),
        issuer: z.string().max(100).optional().default(''),
        month: monthSchema,
        year: yearSchema,
        date: z.coerce.date().nullable().optional(),
        description: z.string().max(1000).optional().default(''),
      }),
    )
    .optional(),
  publications: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().min(1).max(200),
        publisher: z.string().max(100).optional().default(''),
        month: monthSchema,
        year: yearSchema,
        date: z.coerce.date().nullable().optional(),
        url: z.string().url().optional().or(z.literal('')),
        description: z.string().max(1000).optional().default(''),
      }),
    )
    .optional(),
  customSections: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().min(1).max(100),
        description: z.string().max(500).optional().default(''),
        blocks: z
          .array(
            z.object({
              type: z.enum(['text', 'media', 'link']).default('text'),
              content: z.string().max(2000).default(''),
              mediaUrl: z.string().url().optional().or(z.literal('')),
            }),
          )
          .default([]),
        displayOrder: z.number().int().default(0),
      }),
    )
    .optional(),
  achievements: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().min(1).max(150),
        subtitle: z.string().max(100).optional().default(''),
        description: z.string().max(1000).optional().default(''),
        url: z.string().url().optional().or(z.literal('')),
        month: monthSchema,
        year: yearSchema,
        date: z.coerce.date().nullable().optional(),
      }),
    )
    .optional(),
  mediaGallery: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().min(1).max(150),
        subtitle: z.string().max(100).optional().default(''),
        description: z.string().max(1000).optional().default(''),
        url: z.string().url().optional().or(z.literal('')),
        month: monthSchema,
        year: yearSchema,
        date: z.coerce.date().nullable().optional(),
      }),
    )
    .optional(),
  blogs: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().min(1).max(150),
        subtitle: z.string().max(100).optional().default(''),
        description: z.string().max(1000).optional().default(''),
        url: z.string().url().optional().or(z.literal('')),
        month: monthSchema,
        year: yearSchema,
        date: z.coerce.date().nullable().optional(),
      }),
    )
    .optional(),
  research: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().min(1).max(150),
        subtitle: z.string().max(100).optional().default(''),
        description: z.string().max(1000).optional().default(''),
        url: z.string().url().optional().or(z.literal('')),
        month: monthSchema,
        year: yearSchema,
        date: z.coerce.date().nullable().optional(),
      }),
    )
    .optional(),
  courses: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().min(1).max(150),
        subtitle: z.string().max(100).optional().default(''),
        description: z.string().max(1000).optional().default(''),
        url: z.string().url().optional().or(z.literal('')),
        month: monthSchema,
        year: yearSchema,
        date: z.coerce.date().nullable().optional(),
      }),
    )
    .optional(),
  speaking: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().min(1).max(150),
        subtitle: z.string().max(100).optional().default(''),
        description: z.string().max(1000).optional().default(''),
        url: z.string().url().optional().or(z.literal('')),
        month: monthSchema,
        year: yearSchema,
        date: z.coerce.date().nullable().optional(),
      }),
    )
    .optional(),
  organizations: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().min(1).max(150),
        subtitle: z.string().max(100).optional().default(''),
        description: z.string().max(1000).optional().default(''),
        url: z.string().url().optional().or(z.literal('')),
        month: monthSchema,
        year: yearSchema,
        date: z.coerce.date().nullable().optional(),
      }),
    )
    .optional(),
  teaching: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().min(1).max(150),
        subtitle: z.string().max(100).optional().default(''),
        description: z.string().max(1000).optional().default(''),
        url: z.string().url().optional().or(z.literal('')),
        month: monthSchema,
        year: yearSchema,
        date: z.coerce.date().nullable().optional(),
      }),
    )
    .optional(),
  sectionOrder: z.array(z.string()).optional(),
});

export const updateVisibilitySchema = z.object({
  avatarVisibility: z.enum(Object.values(SECTION_VISIBILITY)).optional(),
  sectionVisibility: z.record(z.enum(Object.values(SECTION_VISIBILITY))).optional(),
  fieldVisibility: z.record(z.enum(Object.values(SECTION_VISIBILITY))).optional(),
});

export const setModeSchema = z.object({
  mode: z.enum(Object.values(VISIBILITY_MODE)),
});

export const setTemporaryModeSchema = z.object({
  mode: z.enum(Object.values(VISIBILITY_MODE)),
  durationHours: z.number().positive().max(720).optional(), // up to 30 days
  expiresAt: z.coerce.date().optional(),
  fallbackMode: z.enum(Object.values(VISIBILITY_MODE)).default(VISIBILITY_MODE.PUBLIC),
});

export const changeUsernameSchema = z.object({
  username: z
    .string({ required_error: 'Username is required' })
    .min(USERNAME.MIN_LENGTH, `Username must be at least ${USERNAME.MIN_LENGTH} characters`)
    .max(USERNAME.MAX_LENGTH, `Username cannot exceed ${USERNAME.MAX_LENGTH} characters`)
    .regex(
      USERNAME.PATTERN,
      'Username may only contain lowercase letters, numbers, and hyphens (no underscores)',
    )
    .toLowerCase()
    .trim(),
});

export const createIdentitySchema = z.object({
  customTitle: z.string().min(2).max(80).transform(sanitizeText),
  professionId: z.string().regex(/^[0-9a-fA-F]{24}$/).nullable().optional(),
  isPrimary: z.boolean().default(false),
  displayOrder: z.number().int().default(0),
});

export const updateIdentitySchema = z.object({
  customTitle: z.string().min(2).max(80).transform(sanitizeText).optional(),
  professionId: z.string().regex(/^[0-9a-fA-F]{24}$/).nullable().optional(),
  isPrimary: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
});

export const updateProfileTemplateSchema = z
  .object({
    templateId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid template ID format').optional(),
    templateSlug: z.string().min(2).max(60).optional(),
    personaId: z.string().optional(),
  })
  .refine((data) => data.templateId || data.templateSlug, {
    message: 'Either templateId or templateSlug must be provided',
  });

export const adminTemplateSchema = z.object({
  name: z.string().min(2).max(60),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase alphanumeric characters and hyphens'),
  description: z.string().min(10).max(400),
  category: z.string().max(60).optional().default('General'),
  recommendedSectionIds: z.array(z.string()).min(1),
  layoutConfig: z.record(z.any()).optional(),
  themeConfig: z.record(z.any()).optional(),
  previewImage: z.string().url().nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
  displayOrder: z.number().int().optional().default(0),
  isFeatured: z.boolean().optional().default(false),
});

export function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    throw new ValidationError('Validation failed', details);
  }
  return result.data;
}
