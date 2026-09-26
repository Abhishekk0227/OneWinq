import { razorpayClient } from '../../infrastructure/payment/razorpayClient.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../shared/errors.js';
import { ERROR_CODE, HTTP, APP_EVENT } from '../../config/constants.js';
import { eventBus } from '../../events/eventBus.js';

export const PAYMENT_PURPOSE = Object.freeze({
  CARD_PURCHASE: 'CARD_PURCHASE',
  MEMBERSHIP: 'MEMBERSHIP',
  TEMPLATE_PURCHASE: 'TEMPLATE_PURCHASE',
});

/**
 * Modular extensible payment handlers registry.
 * Future purchases (Membership, Template, etc.) can be plugged in here easily.
 */
const paymentHandlers = {
  /**
   * Handler for Physical Smart Card Purchases
   */
  async [PAYMENT_PURPOSE.CARD_PURCHASE]({ userId, orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
    // Dynamic import to avoid circular dependency
    const { orderService } = await import('../cards/order.service.js');
    return await orderService.verifyOrderPayment({
      userId,
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });
  },

  /**
   * Extensible handler for Membership Subscription Purchases (Ready for future activation)
   */
  async [PAYMENT_PURPOSE.MEMBERSHIP]({ userId, metadata, razorpayPaymentId }) {
    logger.info('[PaymentService] Processing Membership purchase', { userId, metadata, razorpayPaymentId });
    // Future implementation: upgrade user subscription, set plan expiry, emit event
    eventBus.publish(APP_EVENT.SUBSCRIPTION_UPGRADED || 'MEMBERSHIP_PURCHASED', {
      userId,
      planCode: metadata?.planCode || 'PRO',
      paymentId: razorpayPaymentId,
      timestamp: new Date(),
    });

    return {
      status: 'SUCCESS',
      purpose: PAYMENT_PURPOSE.MEMBERSHIP,
      planCode: metadata?.planCode || 'PRO',
      message: 'Membership purchase verified successfully.',
    };
  },

  /**
   * Extensible handler for Template Purchases (Ready for future activation)
   */
  async [PAYMENT_PURPOSE.TEMPLATE_PURCHASE]({ userId, metadata, razorpayPaymentId }) {
    logger.info('[PaymentService] Processing Template purchase', { userId, metadata, razorpayPaymentId });
    // Future implementation: unlock template for user in ProfileTemplate or User unlockedTemplates array
    eventBus.publish('TEMPLATE_PURCHASED', {
      userId,
      templateId: metadata?.templateId,
      paymentId: razorpayPaymentId,
      timestamp: new Date(),
    });

    return {
      status: 'SUCCESS',
      purpose: PAYMENT_PURPOSE.TEMPLATE_PURCHASE,
      templateId: metadata?.templateId,
      message: 'Profile template purchase verified successfully.',
    };
  },
};

export const paymentService = {
  /**
   * Initiate a Razorpay payment order for any purpose (Card, Membership, Template, etc.)
   */
  async initiatePaymentOrder({ userId, purpose = PAYMENT_PURPOSE.CARD_PURCHASE, amountInPaise, currency = 'INR', receipt, notes = {} }) {
    if (!Object.values(PAYMENT_PURPOSE).includes(purpose)) {
      throw new AppError(`Invalid payment purpose: ${purpose}`, ERROR_CODE.VALIDATION_ERROR, HTTP.BAD_REQUEST);
    }

    const rzpOrder = await razorpayClient.createOrder({
      amount: amountInPaise,
      currency,
      receipt: receipt || `RCP-${Date.now().toString(36).toUpperCase()}`,
      notes: {
        userId: userId?.toString(),
        purpose,
        ...notes,
      },
    });

    return {
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      receipt: rzpOrder.receipt,
      purpose,
      isTestMode: !razorpayClient.isConfigured || rzpOrder.id.startsWith('order_mock_'),
    };
  },

  /**
   * Verify Razorpay payment signature and execute corresponding handler
   */
  async verifyPayment({ userId, razorpayOrderId, razorpayPaymentId, razorpaySignature, purpose = PAYMENT_PURPOSE.CARD_PURCHASE, orderId, metadata = {} }) {
    const isSignatureValid = razorpayClient.verifyPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!isSignatureValid) {
      logger.warn('[PaymentService] Invalid payment signature attempt', {
        userId,
        razorpayOrderId,
        razorpayPaymentId,
      });
      throw new AppError('Payment signature verification failed', ERROR_CODE.PAYMENT_FAILED, HTTP.BAD_REQUEST);
    }

    const handler = paymentHandlers[purpose];
    if (!handler) {
      throw new AppError(`No handler registered for payment purpose: ${purpose}`, ERROR_CODE.INTERNAL_ERROR, HTTP.INTERNAL_SERVER_ERROR);
    }

    const result = await handler({
      userId,
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      metadata,
    });

    logger.info('[PaymentService] Payment verified and handled successfully', {
      userId,
      purpose,
      razorpayPaymentId,
      razorpayOrderId,
    });

    return {
      success: true,
      purpose,
      paymentId: razorpayPaymentId,
      orderId,
      data: result,
    };
  },
};
