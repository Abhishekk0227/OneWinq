import { Router } from 'express';
import { analyticsController } from './analytics.controller.js';
import { authenticate } from '../../middleware/authenticate.js';

export const analyticsRoutes = Router();

// Link click tracking can be submitted publicly from viewer profiles
analyticsRoutes.post('/events/link-click', analyticsController.trackLinkClick);

// Dashboard routes require authentication
analyticsRoutes.get('/overview', authenticate, analyticsController.getOverview);
analyticsRoutes.get('/profile', authenticate, analyticsController.getProfileAnalytics);
analyticsRoutes.get('/cards/:cardUid', authenticate, analyticsController.getCardAnalytics);
