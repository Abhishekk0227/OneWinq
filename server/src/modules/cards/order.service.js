import { Order } from './order.model.js';
import { ORDER_STATE, APP_EVENT, ERROR_CODE, HTTP } from '../../config/constants.js';
import { NotFoundError, AppError } from '../../shared/errors.js';
import { eventBus } from '../../events/eventBus.js';
import { razorpayClient } from '../../infrastructure/payment/razorpayClient.js';

const CARD_PRICES_USD = Object.freeze({
  pvc: 2900,
  bamboo: 3900,
  metal: 7900,
  wooden: 3900,
  metallic: 7900,
});

// Original base prices in paise (₹1 = 100 paise)
const CARD_PRICES_INR = Object.freeze({
  pvc: 59900,      // ₹599 original base -> ₹499 net after ₹100 discount
  wooden: 109900,  // ₹1,099 original base -> ₹999 net after ₹100 discount
  wood: 109900,
  metallic: 159900,// ₹1,599 original base -> ₹1,499 net after ₹100 discount
  metal: 159900,
  bamboo: 109900,
});

// ₹100 discount in paise applied on each card purchase
const CARD_DISCOUNT_PER_UNIT_INR = 10000; // 10000 paise = ₹100

export const orderService = {
  /**
   * Create a new hardware order with ₹100 discount per card and Razorpay order setup.
   */
  async createOrder({ userId, items, shippingAddress, currency, designTier }) {
    let totalAmount = 0;
    let originalAmount = 0;
    let discountAmount = 0;
    const isINR = currency?.toUpperCase() !== 'USD'; // default to INR

    const processedItems = items.map((item) => {
      const typeKey = (item.cardType || '').toLowerCase();
      let originalUnitPrice;
      let discount = 0;

      if (isINR) {
        originalUnitPrice = CARD_PRICES_INR[typeKey] || 50000;
        discount = Math.min(CARD_DISCOUNT_PER_UNIT_INR, originalUnitPrice);
      } else {
        originalUnitPrice = CARD_PRICES_USD[typeKey] || 2900;
        discount = 0;
      }

      const unitPrice = Math.max(0, originalUnitPrice - discount);
      const quantity = item.quantity || 1;

      originalAmount += originalUnitPrice * quantity;
      discountAmount += discount * quantity;
      totalAmount += unitPrice * quantity;

      return {
        cardType: item.cardType,
        quantity,
        unitPrice,
        originalUnitPrice,
        discount,
        customDesignUrl: item.customDesignUrl || null,
      };
    });

    const timestampPart = Date.now().toString(36).toUpperCase();
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderNumber = `ORD-${timestampPart}-${randomPart}`;

    // Initialize Razorpay order for this transaction
    const rzpOrder = await razorpayClient.createOrder({
      amount: totalAmount,
      currency: isINR ? 'INR' : 'USD',
      receipt: orderNumber,
      notes: {
        orderNumber,
        userId: userId.toString(),
        purpose: 'CARD_PURCHASE',
        discountPerCardInr: 100,
        discountAmount,
      },
    });

    const order = await Order.create({
      user: userId,
      orderNumber,
      state: ORDER_STATE.CREATED,
      items: processedItems,
      shippingAddress,
      totalAmount,
      originalAmount,
      discountAmount,
      currency: isINR ? 'INR' : (currency || 'INR'),
      paymentGateway: 'RAZORPAY',
      razorpayOrderId: rzpOrder.id,
    });

    eventBus.publish(APP_EVENT.ORDER_CREATED, {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      userId: userId.toString(),
      totalAmount,
      originalAmount,
      discountAmount,
      razorpayOrderId: rzpOrder.id,
      timestamp: new Date(),
    });

    const orderData = {
      id: order._id.toString(),
      _id: order._id.toString(),
      orderNumber: order.orderNumber,
      state: order.state,
      items: order.items,
      shippingAddress: order.shippingAddress,
      totalAmount: order.totalAmount,
      originalAmount: order.originalAmount,
      discountAmount: order.discountAmount,
      amount: order.totalAmount,
      currency: order.currency,
      paymentGateway: order.paymentGateway,
      razorpayOrderId: order.razorpayOrderId,
      designTier: designTier || order.items?.[0]?.cardType?.toUpperCase() || 'PVC',
      createdAt: order.createdAt,
    };

    return {
      ...orderData,
      order: orderData,
      razorpayOrder: {
        id: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        receipt: rzpOrder.receipt,
        keyId: razorpayClient.isConfigured ? razorpayClient.keyId : null,
        isConfigured: razorpayClient.isConfigured,
        isTestMode: true,
      },
    };
  },

  /**
   * Verify one-time payment for a card order and mark as PAID.
   */
  async verifyOrderPayment({ userId, orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
    const query = { user: userId };
    if (orderId) {
      query._id = orderId;
    } else if (razorpayOrderId) {
      query.razorpayOrderId = razorpayOrderId;
    } else {
      throw new NotFoundError('Order identifier required');
    }

    const order = await Order.findOne(query);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (order.state === ORDER_STATE.PAID || order.state === ORDER_STATE.PROCESSING || order.state === ORDER_STATE.SHIPPED || order.state === ORDER_STATE.DELIVERED) {
      return {
        id: order._id.toString(),
        orderNumber: order.orderNumber,
        state: order.state,
        totalAmount: order.totalAmount,
        originalAmount: order.originalAmount,
        discountAmount: order.discountAmount,
        razorpayOrderId: order.razorpayOrderId,
        razorpayPaymentId: order.razorpayPaymentId,
        paymentVerifiedAt: order.paymentVerifiedAt,
      };
    }

    const isValid = razorpayClient.verifyPaymentSignature({
      razorpayOrderId: razorpayOrderId || order.razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!isValid) {
      throw new AppError('Payment signature verification failed', ERROR_CODE.PAYMENT_FAILED, HTTP.BAD_REQUEST);
    }

    order.state = ORDER_STATE.PAID;
    order.razorpayPaymentId = razorpayPaymentId;
    order.razorpaySignature = razorpaySignature;
    order.paymentVerifiedAt = new Date();
    await order.save();

    eventBus.publish(APP_EVENT.ORDER_PAID, {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      userId: userId.toString(),
      totalAmount: order.totalAmount,
      razorpayPaymentId,
      timestamp: new Date(),
    });

    return {
      id: order._id.toString(),
      _id: order._id.toString(),
      orderNumber: order.orderNumber,
      state: order.state,
      totalAmount: order.totalAmount,
      originalAmount: order.originalAmount,
      discountAmount: order.discountAmount,
      razorpayOrderId: order.razorpayOrderId,
      razorpayPaymentId: order.razorpayPaymentId,
      paymentVerifiedAt: order.paymentVerifiedAt,
    };
  },

  /**
   * List all orders for an authenticated user.
   */
  async listOrders(userId) {
    const orders = await Order.find({ user: userId, state: { $ne: ORDER_STATE.CREATED } }).sort({ createdAt: -1 }).lean();

    return orders.map((o) => ({
      id: o._id.toString(),
      _id: o._id.toString(),
      orderNumber: o.orderNumber,
      state: o.state,
      itemsCount: o.items.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount: o.totalAmount,
      originalAmount: o.originalAmount,
      discountAmount: o.discountAmount,
      amount: o.totalAmount,
      currency: o.currency,
      paymentGateway: o.paymentGateway,
      razorpayOrderId: o.razorpayOrderId,
      razorpayPaymentId: o.razorpayPaymentId,
      paymentVerifiedAt: o.paymentVerifiedAt,
      designTier: o.items?.[0]?.cardType?.toUpperCase() || 'PVC',
      trackingNumber: o.trackingNumber,
      carrier: o.carrier,
      items: o.items,
      shippingAddress: o.shippingAddress,
      createdAt: o.createdAt,
    }));
  },

  /**
   * Get single order details for owner.
   */
  async getOrder(userId, orderId) {
    const order = await Order.findOne({ _id: orderId, user: userId }).lean();

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    return {
      id: order._id.toString(),
      orderNumber: order.orderNumber,
      state: order.state,
      items: order.items,
      shippingAddress: order.shippingAddress,
      totalAmount: order.totalAmount,
      originalAmount: order.originalAmount,
      discountAmount: order.discountAmount,
      currency: order.currency,
      paymentGateway: order.paymentGateway,
      razorpayOrderId: order.razorpayOrderId,
      razorpayPaymentId: order.razorpayPaymentId,
      paymentVerifiedAt: order.paymentVerifiedAt,
      carrier: order.carrier,
      trackingNumber: order.trackingNumber,
      assignedCardUids: order.assignedCardUids,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  },

  /**
   * Cancel an order if it is still in CREATED (unpaid / initial placed) state.
   */
  async cancelOrder({ userId, orderId }) {
    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (order.state !== ORDER_STATE.CREATED) {
      throw new AppError(
        'Order cannot be cancelled once payment has been completed or production has started.',
        ERROR_CODE.INVALID_STATE_TRANSITION,
        HTTP.BAD_REQUEST,
      );
    }

    order.state = ORDER_STATE.CANCELLED;
    await order.save();

    eventBus.publish(APP_EVENT.ORDER_CANCELLED, {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      userId: userId.toString(),
      timestamp: new Date(),
    });

    return {
      id: order._id.toString(),
      _id: order._id.toString(),
      orderNumber: order.orderNumber,
      state: order.state,
    };
  },
};
