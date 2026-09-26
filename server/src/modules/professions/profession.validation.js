import { z } from 'zod';
import { ValidationError } from '../../shared/errors.js';

// Sanitize string to prevent script/HTML injection
function sanitizeText(val) {
  if (typeof val !== 'string') return val;
  return val.replace(/<[^>]*>?/gm, '').trim();
}

export const createCustomProfessionSchema = z.object({
  name: z
    .string({ required_error: 'Profession name is required' })
    .min(2, 'Profession name must be at least 2 characters')
    .max(80, 'Profession name cannot exceed 80 characters')
    .transform(sanitizeText)
    .refine((val) => val.length >= 2, {
      message: 'Profession name contains invalid characters',
    }),
});

export const searchProfessionsSchema = z.object({
  query: z.string().optional().transform((v) => (v ? sanitizeText(v) : '')),
  category: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const adminCreateCategorySchema = z.object({
  name: z.string().min(2).max(80).transform(sanitizeText),
  slug: z.string().optional(),
  icon: z.string().optional(),
  displayOrder: z.coerce.number().int().optional(),
});

export const adminUpdateCategorySchema = z.object({
  name: z.string().min(2).max(80).transform(sanitizeText).optional(),
  slug: z.string().optional(),
  icon: z.string().optional(),
  displayOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const adminCreateProfessionSchema = z.object({
  name: z.string().min(2).max(80).transform(sanitizeText),
  subtitle: z.string().max(200).optional().default(''),
  aliases: z.array(z.string().max(80)).optional().default([]),
  categoryId: z.string().optional().nullable(),
  recommendedSectionTypes: z.array(z.string()).optional(),
  isOfficial: z.boolean().optional(),
});

export const adminUpdateProfessionSchema = z.object({
  name: z.string().min(2).max(80).transform(sanitizeText).optional(),
  subtitle: z.string().max(200).optional(),
  aliases: z.array(z.string().max(80)).optional(),
  categoryId: z.string().optional().nullable(),
  recommendedSectionTypes: z.array(z.string()).optional(),
  isOfficial: z.boolean().optional(),
  isActive: z.boolean().optional(),
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
