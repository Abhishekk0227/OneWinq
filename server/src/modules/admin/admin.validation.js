import { z } from 'zod';
import { ACCOUNT_STATE, ADMIN_ROLE, ORDER_STATE } from '../../config/constants.js';

export const updateUserStatusSchema = z.object({
  status: z.enum([
    ACCOUNT_STATE.ACTIVE,
    ACCOUNT_STATE.SUSPENDED,
    ACCOUNT_STATE.DEACTIVATED,
  ]),
  reason: z.string().min(3, 'Reason must be at least 3 characters').max(500),
});

export const updateUserRoleSchema = z.object({
  role: z.enum([...Object.values(ADMIN_ROLE), 'USER']),
});

export const createCardBatchSchema = z.object({
  batchNumber: z.string().min(3).max(50),
  cardType: z.enum(['pvc', 'metal', 'bamboo']),
  totalCards: z.coerce.number().int().min(1).max(5000),
});

export const adminUserQuerySchema = z.object({
  q: z.string().optional(),
  accountState: z.enum(Object.values(ACCOUNT_STATE)).optional(),
  role: z.enum([...Object.values(ADMIN_ROLE), 'USER']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().optional(),
});

export const generateCardsSchema = z.object({
  count: z.coerce.number().int().min(1).max(5000).default(1),
  material: z.enum(['pvc', 'metal', 'bamboo', 'wooden', 'metallic']).default('pvc'),
  notes: z.string().max(500).optional().default(''),
});

export const assignCardSchema = z
  .object({
    userId: z.string().optional(),
    targetUserId: z.string().optional(),
  })
  .transform((data) => ({
    userId: (data.userId || data.targetUserId || '').trim(),
  }))
  .refine((data) => data.userId.length > 0, {
    message: 'Target user ID is required',
    path: ['userId'],
  });

export const updateCardStateAdminSchema = z.object({
  state: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED', 'UNASSIGNED']),
  reason: z.string().max(500).optional(),
});

export const adminOrderQuerySchema = z.object({
  q: z.string().optional(),
  status: z.enum([...Object.values(ORDER_STATE), 'ALL']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const updateOrderAdminSchema = z.object({
  state: z.enum(Object.values(ORDER_STATE)).optional(),
  carrier: z.string().max(100).optional(),
  trackingNumber: z.string().max(100).optional(),
});

export const fulfillOrderAdminSchema = z.object({
  cardCode: z.string().optional(),
  carrier: z.string().max(100).optional(),
  trackingNumber: z.string().max(100).optional(),
  state: z.enum(Object.values(ORDER_STATE)).default(ORDER_STATE.SHIPPED),
});

export const toggleTemplateLockSchema = z.object({
  isLocked: z.boolean(),
});

export const bulkLockTemplatesSchema = z.object({
  isLocked: z.boolean(),
  templateIds: z.array(z.string()).optional(),
});

