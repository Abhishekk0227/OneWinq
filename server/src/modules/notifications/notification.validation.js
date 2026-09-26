import { z } from 'zod';
import { ValidationError } from '../../shared/errors.js';

export const listNotificationsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  isRead: z
    .preprocess((val) => {
      if (val === 'true' || val === true) {
        return true;
      }
      if (val === 'false' || val === false) {
        return false;
      }
      return undefined;
    }, z.boolean().optional())
    .optional(),
});

export const updatePreferencesSchema = z.object({
  inApp: z
    .object({
      connectionRequests: z.boolean().optional(),
      messages: z.boolean().optional(),
      profileViews: z.boolean().optional(),
      system: z.boolean().optional(),
    })
    .optional(),
  email: z
    .object({
      connectionRequests: z.boolean().optional(),
      messages: z.boolean().optional(),
      profileViews: z.boolean().optional(),
      marketing: z.boolean().optional(),
      // security is intentionally omitted/ignored to prevent disabling security alerts
    })
    .optional(),
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
