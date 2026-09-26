import { Router } from 'express';
import { notificationController } from './notification.controller.js';
import { authenticate } from '../../middleware/authenticate.js';

export const notificationRoutes = Router();

// All notification routes require authentication
notificationRoutes.use(authenticate);

// Preferences routes (placed before parameterized /:id routes)
notificationRoutes.get('/preferences', notificationController.getPreferences);
notificationRoutes.patch('/preferences', notificationController.updatePreferences);

// Notification inbox and status
notificationRoutes.get('/', notificationController.listNotifications);
notificationRoutes.get('/unread-count', notificationController.getUnreadCount);
notificationRoutes.post('/read-all', notificationController.markAllAsRead);
notificationRoutes.patch('/:id/read', notificationController.markAsRead);
