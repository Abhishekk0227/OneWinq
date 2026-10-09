import { z } from 'zod';
import { ValidationError } from '../../shared/errors.js';

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(1, 'Department name is required').max(100),
  code: z.string().trim().max(20).default(''),
  description: z.string().trim().max(500).default(''),
  parentDepartmentId: z.string().nullable().optional(),
  leadMemberId: z.string().nullable().optional(),
});

export const updateDepartmentSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  code: z.string().trim().max(20).optional(),
  description: z.string().trim().max(500).optional(),
  parentDepartmentId: z.string().nullable().optional(),
  leadMemberId: z.string().nullable().optional(),
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
