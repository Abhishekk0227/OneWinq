import { z } from 'zod';
import { MEDIA_PURPOSE } from '../../config/constants.js';
import { ValidationError } from '../../shared/errors.js';

export const PURPOSE_RULES = Object.freeze({
  [MEDIA_PURPOSE.PROFILE_PHOTO]: {
    maxBytes: 5 * 1024 * 1024, // 5MB
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  [MEDIA_PURPOSE.PROFILE_COVER]: {
    maxBytes: 10 * 1024 * 1024, // 10MB
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  [MEDIA_PURPOSE.PROFILE_SECTION]: {
    maxBytes: 15 * 1024 * 1024, // 15MB
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  },
  [MEDIA_PURPOSE.MESSAGE_ATTACHMENT]: {
    maxBytes: 25 * 1024 * 1024, // 25MB
    allowedMimes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
      'application/zip',
      'audio/mpeg',
      'audio/mp4',
      'audio/wav',
      'text/plain',
    ],
  },
  [MEDIA_PURPOSE.CARD_MEDIA]: {
    maxBytes: 10 * 1024 * 1024, // 10MB
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'application/pdf'],
  },
  [MEDIA_PURPOSE.SUPPORT_EVIDENCE]: {
    maxBytes: 20 * 1024 * 1024, // 20MB
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain'],
  },
  [MEDIA_PURPOSE.REPORT_EVIDENCE]: {
    maxBytes: 20 * 1024 * 1024, // 20MB
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain'],
  },
  [MEDIA_PURPOSE.POST_MEDIA]: {
    maxBytes: 100 * 1024 * 1024, // 100MB
    allowedMimes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/ogg',
    ],
  },
  [MEDIA_PURPOSE.PRIVATE_DOCUMENT]: {
    maxBytes: 25 * 1024 * 1024, // 25MB
    allowedMimes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
    ],
  },
});

export const requestUploadUrlSchema = z
  .object({
    purpose: z.enum(Object.values(MEDIA_PURPOSE), {
      required_error: 'Valid media purpose is required',
    }),
    filename: z
      .string({ required_error: 'filename is required' })
      .min(1, 'filename cannot be empty')
      .max(255, 'filename is too long')
      .transform((val) => val.trim()),
    mimeType: z
      .string({ required_error: 'mimeType is required' })
      .min(1, 'mimeType cannot be empty')
      .transform((val) => val.trim().toLowerCase()),
    sizeBytes: z
      .number({ required_error: 'sizeBytes is required' })
      .int()
      .min(1, 'sizeBytes must be greater than 0'),
  })
  .superRefine((data, ctx) => {
    const rules = PURPOSE_RULES[data.purpose];
    if (!rules) {
      return;
    }

    if (data.sizeBytes > rules.maxBytes) {
      const maxMb = Math.round(rules.maxBytes / (1024 * 1024));
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sizeBytes'],
        message: `File size exceeds maximum allowed of ${maxMb}MB for ${data.purpose}`,
      });
    }

    if (!rules.allowedMimes.includes(data.mimeType)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['mimeType'],
        message: `MIME type '${data.mimeType}' is not permitted for ${data.purpose}. Allowed types: ${rules.allowedMimes.join(', ')}`,
      });
    }
  });

export const confirmUploadSchema = z.object({
  mediaId: z
    .string({ required_error: 'mediaId is required' })
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid media ID format'),
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
