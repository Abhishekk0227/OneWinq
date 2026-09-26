import { orderService } from './order.service.js';
import { createOrderSchema, validate } from './card.validation.js';
import { successResponse } from '../../shared/response.js';

export const orderController = {
  /**
   * POST /api/v1/orders
   */
  async createOrder(req, res, next) {
    try {
      const validated = validate(createOrderSchema, req.body);
      const result = await orderService.createOrder({
        userId: req.user.id,
        ...validated,
      });
      return res.status(201).json(
        successResponse({
          order: result.order || result,
          razorpayOrder: result.razorpayOrder,
        }, 'Hardware card order placed successfully.'),
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * POST /api/v1/orders/:id/verify-payment
   */
  async verifyPayment(req, res, next) {
    try {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
      const order = await orderService.verifyOrderPayment({
        userId: req.user.id,
        orderId: req.params.id,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      });
      return res.status(200).json(
        successResponse({ order }, 'Card order payment verified successfully.'),
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/v1/orders
   */
  async listOrders(req, res, next) {
    try {
      const orders = await orderService.listOrders(req.user.id);
      return res.status(200).json(
        successResponse({ orders }, 'Orders retrieved successfully.'),
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/v1/orders/:id
   */
  async getOrder(req, res, next) {
    try {
      const order = await orderService.getOrder(req.user.id, req.params.id);
      return res.status(200).json(
        successResponse({ order }, 'Order details retrieved successfully.'),
      );
    } catch (err) {
      return next(err);
    }
  },
};
