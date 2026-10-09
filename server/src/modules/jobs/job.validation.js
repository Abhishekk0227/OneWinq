import { z } from 'zod';
import {
  JOB_STATUS,
  EMPLOYMENT_TYPE,
  WORKPLACE_TYPE,
  APPLICATION_STATUS,
} from '../../config/constants.js';
import { ValidationError } from '../../shared/errors.js';

export const createJobSchema = z.object({
  title: z
    .string({ required_error: 'Job title is required' })
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(150, 'Title cannot exceed 150 characters'),
  departmentId: z.string().nullable().optional(),
  description: z
    .string({ required_error: 'Job description is required' })
    .trim()
    .min(20, 'Description must be at least 20 characters')
    .max(20000),
  employmentType: z.enum(Object.values(EMPLOYMENT_TYPE)).default(EMPLOYMENT_TYPE.FULL_TIME),
  workplaceType: z.enum(Object.values(WORKPLACE_TYPE)).default(WORKPLACE_TYPE.ON_SITE),
  location: z
    .object({
      city: z.string().trim().default(''),
      state: z.string().trim().default(''),
      country: z.string().trim().default(''),
      isRemote: z.boolean().default(false),
    })
    .default({}),
  salary: z
    .object({
      min: z.coerce.number().nullable().optional(),
      max: z.coerce.number().nullable().optional(),
      currency: z.string().trim().default('INR'),
      period: z.enum(['YEARLY', 'MONTHLY', 'HOURLY']).default('YEARLY'),
      isDisclosed: z.boolean().default(true),
    })
    .default({}),
  skills: z.array(z.string().trim()).default([]),
  experienceLevel: z.string().trim().default(''),
  status: z.enum(Object.values(JOB_STATUS)).default(JOB_STATUS.PUBLISHED),
  expiresAt: z.coerce.date().nullable().optional(),
});

export const updateJobSchema = z.object({
  title: z.string().trim().min(3).max(150).optional(),
  departmentId: z.string().nullable().optional(),
  description: z.string().trim().min(20).max(20000).optional(),
  employmentType: z.enum(Object.values(EMPLOYMENT_TYPE)).optional(),
  workplaceType: z.enum(Object.values(WORKPLACE_TYPE)).optional(),
  location: z
    .object({
      city: z.string().trim().default(''),
      state: z.string().trim().default(''),
      country: z.string().trim().default(''),
      isRemote: z.boolean().default(false),
    })
    .optional(),
  salary: z
    .object({
      min: z.coerce.number().nullable().optional(),
      max: z.coerce.number().nullable().optional(),
      currency: z.string().trim().default('INR'),
      period: z.enum(['YEARLY', 'MONTHLY', 'HOURLY']).default('YEARLY'),
      isDisclosed: z.boolean().default(true),
    })
    .optional(),
  skills: z.array(z.string().trim()).optional(),
  experienceLevel: z.string().trim().optional(),
  status: z.enum(Object.values(JOB_STATUS)).optional(),
  expiresAt: z.coerce.date().nullable().optional(),
});

export const listJobsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().trim().optional(),
  organizationId: z.string().optional(),
  employmentType: z.enum(Object.values(EMPLOYMENT_TYPE)).optional(),
  workplaceType: z.enum(Object.values(WORKPLACE_TYPE)).optional(),
  departmentId: z.string().optional(),
  status: z.enum(Object.values(JOB_STATUS)).optional(),
  city: z.string().trim().optional(),
  country: z.string().trim().optional(),
});

export const applyJobSchema = z.object({
  resumeUrl: z.string().url().nullable().optional(),
  coverLetter: z.string().trim().max(5000).default(''),
});

export const updateApplicationStatusSchema = z.object({
  status: z.enum(Object.values(APPLICATION_STATUS)),
  comment: z.string().trim().max(1000).default(''),
});

export const addApplicationNoteSchema = z.object({
  note: z.string().trim().min(1, 'Note cannot be empty').max(2000),
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
