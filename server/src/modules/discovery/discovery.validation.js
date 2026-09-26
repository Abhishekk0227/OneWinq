import { z } from 'zod';
import { ValidationError } from '../../shared/errors.js';

function sanitizeText(val) {
  if (typeof val !== 'string') {return val;}
  return val.replace(/<[^>]*>?/gm, '').trim();
}

export const discoverySearchSchema = z.object({
  q: z.string().optional().transform((v) => (v ? sanitizeText(v) : '')),
  profession: z.string().optional().transform((v) => (v ? sanitizeText(v) : '')),
  skill: z.string().optional().transform((v) => (v ? sanitizeText(v) : '')),
  country: z.string().optional().transform((v) => (v ? sanitizeText(v) : '')),
  city: z.string().optional().transform((v) => (v ? sanitizeText(v) : '')),
  isRemote: z.enum(['true', 'false']).optional().transform((v) => (v ? v === 'true' : undefined)),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
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
