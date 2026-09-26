import { z } from 'zod';
import { ValidationError } from '../../shared/errors.js';

function sanitizeText(val) {
  if (typeof val !== 'string') {
    return val;
  }
  return val.replace(/<[^>]*>?/gm, '').trim();
}

export const startConversationSchema = z
  .object({
    targetUserId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid target user ID format')
      .optional(),
    recipientId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid recipient ID format')
      .optional(),
  })
  .transform((data) => ({
    targetUserId: data.targetUserId || data.recipientId,
  }))
  .refine((data) => !!data.targetUserId, {
    message: 'Either targetUserId or recipientId is required',
  });

export const sendMessageSchema = z
  .object({
    text: z.string().max(5000, 'Message cannot exceed 5000 characters').optional().transform(sanitizeText),
    content: z.string().max(5000, 'Message cannot exceed 5000 characters').optional().transform(sanitizeText),
    type: z.enum(['text', 'image', 'file']).default('text'),
    attachments: z
      .array(
        z.object({
          url: z.string().url('Attachment must have a valid URL'),
          filename: z.string().max(255).optional().default(''),
          sizeBytes: z.number().int().nonnegative().optional().default(0),
          mimeType: z.string().max(100).optional().default(''),
        }),
      )
      .optional()
      .default([]),
  })
  .transform((data) => ({
    ...data,
    text: data.text || data.content || '',
  }))
  .refine((data) => (data.text && data.text.length > 0) || (data.attachments && data.attachments.length > 0), {
    message: 'Message must contain either text or at least one attachment',
  });

export const editMessageSchema = z
  .object({
    text: z
      .string()
      .max(5000, 'Message cannot exceed 5000 characters')
      .optional()
      .transform(sanitizeText),
    content: z
      .string()
      .max(5000, 'Message cannot exceed 5000 characters')
      .optional()
      .transform(sanitizeText),
  })
  .transform((data) => ({
    text: data.text || data.content,
  }))
  .refine((data) => data.text && data.text.length > 0, {
    message: 'Message text cannot be empty',
  });

export const deleteMessageQuerySchema = z.object({
  mode: z.enum(['for-me', 'for-everyone']).default('for-me'),
});

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const createGroupSchema = z.object({
  title: z
    .string()
    .min(1, 'Group title is required')
    .max(100, 'Title cannot exceed 100 characters')
    .transform(sanitizeText),
  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional()
    .default('')
    .transform(sanitizeText),
  avatarUrl: z.string().optional().nullable(),
  memberUserIds: z
    .array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format'))
    .optional()
    .default([]),
});

export const addGroupMembersSchema = z.object({
  memberUserIds: z
    .array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format'))
    .min(1, 'At least one user must be added'),
});

export const updateMemberRoleSchema = z.object({
  targetUserId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid target user ID format'),
  role: z.enum(['ADMIN', 'MEMBER']),
});

export const updateGroupInfoSchema = z.object({
  title: z
    .string()
    .min(1, 'Group title is required')
    .max(100, 'Title cannot exceed 100 characters')
    .optional()
    .transform(sanitizeText),
  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional()
    .transform(sanitizeText),
  avatarUrl: z.string().optional().nullable(),
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

