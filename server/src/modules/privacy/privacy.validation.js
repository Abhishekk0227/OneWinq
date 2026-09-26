import { z } from 'zod';

export const requestExportSchema = z.object({
  format: z.enum(['JSON', 'CSV']).optional().default('JSON'),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required to authorize account deletion'),
  reason: z.string().max(500).optional().default(''),
});
