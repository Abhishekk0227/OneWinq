import { Router } from 'express';
import { userController } from './user.controller.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = Router();

// GET /api/v1/users/me — canonical current-user profile
router.get('/me', authenticate, userController.getMe);

// PATCH /api/v1/users/me — update basic profile details (displayName, avatarUrl)
router.patch('/me', authenticate, userController.updateMe);

// PATCH /api/v1/users/me/privacy — update appearInDiscovery and connection permissions
router.patch('/me/privacy', authenticate, userController.updatePrivacySettings);

// GET /api/v1/users/:id — public details of a user
router.get('/:id', authenticate, userController.getUserById);

// GET /api/v1/users — directory listing
router.get('/', authenticate, userController.listUsers);

export default router;
