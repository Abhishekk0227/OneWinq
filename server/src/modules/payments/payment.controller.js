import { paymentService } from './payment.service.js';
import { config } from '../../config/env.js';
import { successResponse } from '../../shared/response.js';
import { AppError } from '../../shared/errors.js';
import { ERROR_CODE, HTTP } from '../../config/constants.js';

export const paymentController = {
  /**
   * GET /api/v1/payments/config
   * Public configuration for frontend client payment initialization.
   */
  async getConfig(req, res, next) {
    try {
      const { razorpayClient } = await import('../../infrastructure/payment/razorpayClient.js');
      return res.status(200).json(
        successResponse({
          razorpayKeyId: razorpayClient.isConfigured ? razorpayClient.keyId : null,
          isConfigured: razorpayClient.isConfigured,
          isTestMode: true,
          currency: 'INR',
        }, 'Payment configuration retrieved.'),
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * POST /api/v1/payments/verify
   * Verify one-time Razorpay payment and dispatch fulfillment.
   */
  async verifyPayment(req, res, next) {
    try {
      const {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        purpose,
        orderId,
        metadata,
      } = req.body;

      if (!razorpayOrderId || !razorpayPaymentId) {
        throw new AppError(
          'razorpayOrderId and razorpayPaymentId are required',
          ERROR_CODE.VALIDATION_ERROR,
          HTTP.BAD_REQUEST,
        );
      }

      const result = await paymentService.verifyPayment({
        userId: req.user.id,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        purpose: purpose || 'CARD_PURCHASE',
        orderId,
        metadata,
      });

      return res.status(200).json(
        successResponse(result, 'Payment verified and processed successfully.'),
      );
    } catch (err) {
      return next(err);
    }
  },
};
