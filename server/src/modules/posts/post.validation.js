import { z } from 'zod';

export const createPostSchema = z
  .object({
    content: z.string().max(5000, 'Post content cannot exceed 5000 characters').default(''),
    media: z
      .array(
        z.object({
          mediaId: z.string().nullable().optional(),
          type: z.enum(['IMAGE', 'VIDEO']),
          url: z.string().url('Valid media URL is required'),
          thumbnailUrl: z.string().url().nullable().optional(),
        }),
      )
      .max(10, 'Cannot attach more than 10 media items')
      .default([]),
    visibility: z.enum(['PUBLIC', 'CONNECTIONS_ONLY', 'PRIVATE']).default('PUBLIC'),
  })
  .refine(
    (data) => (data.content && data.content.trim().length > 0) || (data.media && data.media.length > 0),
    {
      message: 'Post must contain either text content or at least one media item',
      path: ['content'],
    },
  );

export const updatePostSchema = z.object({
  content: z.string().min(1, 'Post content cannot be empty').max(5000),
});

export const addCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(2000, 'Comment cannot exceed 2000 characters'),
  parentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid parent comment ID').nullable().optional(),
});

export const feedQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  filter: z.enum(['all', 'my', 'saved', 'archived']).default('all'),
  authorUsername: z.string().optional(),
});

import { ValidationError } from '../../shared/errors.js';

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
      const validated = validate(schema, req.query);
      Object.defineProperty(req, 'query', {
        value: validated,
        writable: true,
        configurable: true,
        enumerable: true,
      });
      next();
    } catch (err) {
      next(err);
    }
  };
}
