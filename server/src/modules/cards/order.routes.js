import { Router } from 'express';
import { orderController } from './order.controller.js';
import { authenticate } from '../../middleware/authenticate.js';

export const orderRoutes = Router();

orderRoutes.use(authenticate);

orderRoutes.post('/', orderController.createOrder);
orderRoutes.post('/:id/verify-payment', orderController.verifyPayment);
orderRoutes.patch('/:id/cancel', orderController.cancelOrder);
orderRoutes.get('/', orderController.listOrders);
orderRoutes.get('/:id', orderController.getOrder);
