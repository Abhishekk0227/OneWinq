import { z } from 'zod';
import { ValidationError } from '../../shared/errors.js';

function sanitizeText(val) {
  if (typeof val !== 'string') {return val;}
  return val.replace(/<[^>]*>?/gm, '').trim();
}

export const sendRequestSchema = z
  .object({
    targetUserId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid target user ID format')
      .optional(),
    recipientId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid recipient ID format')
      .optional(),
    note: z.string().max(300, 'Note cannot exceed 300 characters').optional().transform(sanitizeText),
  })
  .refine((data) => Boolean(data.targetUserId || data.recipientId), {
    message: 'targetUserId is required',
    path: ['targetUserId'],
  })
  .transform((data) => ({
    targetUserId: data.targetUserId || data.recipientId,
    note: data.note,
  }));

export const connectionQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const pendingQuerySchema = z
  .object({
    direction: z.enum(['incoming', 'outgoing']).optional(),
    type: z.enum(['incoming', 'outgoing']).optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .transform((data) => ({
    direction: data.direction || data.type || 'incoming',
    cursor: data.cursor,
    limit: data.limit,
  }));

export const blockUserSchema = z.object({
  reason: z.string().max(200).optional().transform(sanitizeText),
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
