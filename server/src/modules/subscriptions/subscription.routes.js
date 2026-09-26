import { Router } from 'express';
import { subscriptionController } from './subscription.controller.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = Router();

// Public routes
router.get('/plans', (req, res, next) => subscriptionController.getPlans(req, res, next));
router.post('/webhook', (req, res, next) => subscriptionController.handleWebhook(req, res, next));

// Authenticated routes
router.use(authenticate);
router.get('/me', (req, res, next) => subscriptionController.getMySubscription(req, res, next));
router.post('/checkout', (req, res, next) => subscriptionController.createCheckout(req, res, next));
router.post('/cancel', (req, res, next) => subscriptionController.cancel(req, res, next));
router.post('/resume', (req, res, next) => subscriptionController.resume(req, res, next));

export default router;
