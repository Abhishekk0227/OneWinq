import { Router } from 'express';
import { paymentController } from './payment.controller.js';
import { authenticate } from '../../middleware/authenticate.js';

export const paymentRoutes = Router();

// Public config route so client can get the Razorpay Key ID
paymentRoutes.get('/config', paymentController.getConfig);

// Authenticated verification route
paymentRoutes.post('/verify', authenticate, paymentController.verifyPayment);

export default paymentRoutes;
