import { z } from 'zod';
import { ValidationError } from '../../shared/errors.js';

export const timeRangeQuerySchema = z
  .object({
    period: z.enum(['7d', '30d', '90d', '1y']).optional(),
    range: z.enum(['7d', '30d', '90d', '1y']).optional(),
    startDate: z.string().datetime({ offset: true }).optional(),
    endDate: z.string().datetime({ offset: true }).optional(),
  })
  .transform((data) => ({
    period: data.period || data.range || '30d',
    range: data.range || data.period || '30d',
    startDate: data.startDate,
    endDate: data.endDate,
  }));

export const trackLinkClickSchema = z
  .object({
    targetUserId: z.string().optional(),
    profileUserId: z.string().optional(),
    linkUrl: z.string({ required_error: 'linkUrl is required' }),
    label: z.string().max(100).optional().default(''),
  })
  .transform((data) => {
    const targetUserId = data.targetUserId || data.profileUserId;
    if (!targetUserId || !/^[0-9a-fA-F]{24}$/.test(targetUserId)) {
      throw new ValidationError('Valid target user ID is required');
    }
    return {
      targetUserId,
      profileUserId: targetUserId,
      linkUrl: data.linkUrl,
      label: data.label || '',
    };
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
