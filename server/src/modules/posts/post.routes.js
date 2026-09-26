import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../../middleware/authenticate.js';
import {
  createPostSchema,
  updatePostSchema,
  addCommentSchema,
  feedQuerySchema,
  validateBody,
  validateQuery,
} from './post.validation.js';
import * as postController from './post.controller.js';

export const postRoutes = Router();

// Feed & list queries
postRoutes.get('/', optionalAuthenticate, validateQuery(feedQuerySchema), postController.getFeedController);

// Create post
postRoutes.post('/', authenticate, validateBody(createPostSchema), postController.createPostController);

// Single post operations
postRoutes.get('/:id', optionalAuthenticate, postController.getPostByIdController);
postRoutes.patch('/:id', authenticate, validateBody(updatePostSchema), postController.updatePostController);
postRoutes.delete('/:id', authenticate, postController.deletePostController);

// Archive / restore post
postRoutes.patch('/:id/archive', authenticate, postController.toggleArchivePostController);

// Interactions (Like, Save/Bookmark, Share)
postRoutes.post('/:id/like', authenticate, postController.toggleLikePostController);
postRoutes.post('/:id/save', authenticate, postController.toggleSavePostController);
postRoutes.post('/:id/share', optionalAuthenticate, postController.sharePostController);

// Nested comments
postRoutes.get('/:id/comments', optionalAuthenticate, postController.getPostCommentsController);
postRoutes.post('/:id/comments', authenticate, validateBody(addCommentSchema), postController.addCommentController);
postRoutes.delete('/:id/comments/:commentId', authenticate, postController.deleteCommentController);
