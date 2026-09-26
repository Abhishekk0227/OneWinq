import crypto from 'crypto';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../shared/errors.js';
import { ERROR_CODE, HTTP } from '../../config/constants.js';

class RazorpayClient {
  constructor() {
    this.keyId = config.razorpay?.keyId;
    this.keySecret = config.razorpay?.keySecret;
    this.webhookSecret = config.razorpay?.webhookSecret;
    this.isConfigured = Boolean(
      this.keyId &&
        this.keySecret &&
        !this.keyId.includes('dummy') &&
        this.keyId.startsWith('rzp_') &&
        this.keyId.length > 15,
    );
  }

  /**
   * Verifies the HMAC-SHA256 signature on an incoming Razorpay webhook.
   * @param {string|Buffer} rawBody - Raw unparsed request body string
   * @param {string} signature - Value from 'x-razorpay-signature' header
   * @param {string} [secret] - Optional override secret
   * @returns {boolean}
   */
  verifyWebhookSignature(rawBody, signature, secret) {
    const webhookSecret = secret || this.webhookSecret || 'test_webhook_secret';

    if (!signature || !rawBody) {
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody))
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'utf8'),
        Buffer.from(expectedSignature, 'utf8')
      );
    } catch (err) {
      logger.error('Razorpay signature verification error', { error: err.message });
      return false;
    }
  }

  /**
   * Generates a test signature for testing / webhook simulation.
   * @param {string|object} payload
   * @param {string} [secret]
   * @returns {string}
   */
  generateTestSignature(payload, secret) {
    const webhookSecret = secret || this.webhookSecret || 'test_webhook_secret';
    const bodyStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHmac('sha256', webhookSecret).update(bodyStr).digest('hex');
  }

  /**
   * Creates a subscription session / order with Razorpay (or mock in development/test).
   * @param {object} params
   * @param {string} params.planCode
   * @param {string} params.billingCycle
   * @param {number} params.amountInRupees
   * @param {string} params.customerEmail
   * @returns {Promise<object>}
   */
  async createSubscription({ planCode, billingCycle, amountInRupees, customerEmail }) {
    if (!this.isConfigured) {
      // Return simulated sandbox subscription for local dev & testing
      const mockSubId = `sub_mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      logger.info('Simulating Razorpay subscription creation in sandbox mode', {
        mockSubId,
        planCode,
        billingCycle,
        amountInRupees,
      });

      return {
        id: mockSubId,
        planId: `plan_${planCode.toLowerCase()}_${billingCycle.toLowerCase()}`,
        status: 'created',
        shortUrl: `https://rzp.io/i/mock_${mockSubId}`,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + (billingCycle === 'YEARLY' ? 365 : 30) * 86400000),
      };
    }

    try {
      // In production with live Razorpay credentials, use basic auth header against Razorpay API
      const authHeader = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
      const period = billingCycle === 'YEARLY' ? 'yearly' : 'monthly';

      const response = await globalThis.fetch('https://api.razorpay.com/v1/subscriptions', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan_id: `plan_${planCode.toLowerCase()}_${period}`,
          total_count: billingCycle === 'YEARLY' ? 5 : 60,
          quantity: 1,
          customer_notify: 1,
          notes: {
            customerEmail,
            planCode,
            billingCycle,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error?.description || 'Razorpay API subscription creation failed');
      }

      const data = await response.json();
      return {
        id: data.id,
        planId: data.plan_id,
        status: data.status,
        shortUrl: data.short_url,
        currentPeriodStart: data.current_start ? new Date(data.current_start * 1000) : new Date(),
        currentPeriodEnd: data.current_end ? new Date(data.current_end * 1000) : null,
      };
    } catch (err) {
      logger.error('Failed to create Razorpay subscription', { error: err.message });
      throw new AppError(
        `Payment gateway error: ${err.message}`,
        ERROR_CODE.EXTERNAL_SERVICE_ERROR,
        HTTP.EXTERNAL_SERVICE_ERROR
      );
    }
  }

  /**
   * Cancels a subscription via Razorpay API (or mock).
   * @param {string} gatewaySubscriptionId
   * @param {boolean} atPeriodEnd
   * @returns {Promise<object>}
   */
  async cancelSubscription(gatewaySubscriptionId, atPeriodEnd = true) {
    if (!this.isConfigured || gatewaySubscriptionId.startsWith('sub_mock_')) {
      logger.info('Simulating Razorpay subscription cancellation in sandbox mode', {
        gatewaySubscriptionId,
        atPeriodEnd,
      });
      return { id: gatewaySubscriptionId, status: 'cancelled' };
    }

    try {
      const authHeader = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
      const response = await globalThis.fetch(
        `https://api.razorpay.com/v1/subscriptions/${gatewaySubscriptionId}/cancel`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${authHeader}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cancel_at_cycle_end: atPeriodEnd ? 1 : 0,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error?.description || 'Razorpay API cancellation failed');
      }

      return await response.json();
    } catch (err) {
      logger.error('Failed to cancel Razorpay subscription', { error: err.message });
      throw new AppError(
        `Payment gateway error: ${err.message}`,
        ERROR_CODE.EXTERNAL_SERVICE_ERROR,
        HTTP.EXTERNAL_SERVICE_ERROR
      );
    }
  }

  /**
   * Creates a one-time payment order with Razorpay (or mock in test/sandbox).
   * @param {object} params
   * @param {number} params.amount - Amount in smallest currency sub-unit (e.g. paise for INR)
   * @param {string} [params.currency='INR']
   * @param {string} [params.receipt]
   * @param {object} [params.notes]
   * @returns {Promise<object>}
   */
  async createOrder({ amount, currency = 'INR', receipt, notes = {} }) {
    if (!this.isConfigured) {
      const mockOrderId = `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      logger.info('Simulating Razorpay order creation in test mode', {
        mockOrderId,
        amount,
        currency,
        receipt,
      });

      return {
        id: mockOrderId,
        entity: 'order',
        amount,
        amount_paid: 0,
        amount_due: amount,
        currency: currency.toUpperCase(),
        receipt: receipt || mockOrderId,
        status: 'created',
        notes,
        created_at: Math.floor(Date.now() / 1000),
      };
    }

    try {
      const authHeader = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
      const response = await globalThis.fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency: currency.toUpperCase(),
          receipt,
          notes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.description || `Razorpay order creation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      logger.error('Failed to create Razorpay order', { error: err.message });
      throw new AppError(
        `Payment gateway error: ${err.message}`,
        ERROR_CODE.EXTERNAL_SERVICE_ERROR,
        HTTP.EXTERNAL_SERVICE_ERROR
      );
    }
  }

  /**
   * Verifies standard Razorpay checkout signature for one-time payments.
   * @param {object} params
   * @param {string} params.razorpayOrderId
   * @param {string} params.razorpayPaymentId
   * @param {string} params.razorpaySignature
   * @returns {boolean}
   */
  verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
    if (!razorpayOrderId || !razorpayPaymentId) {
      return false;
    }

    // In local sandbox / test simulation without live Razorpay credentials
    if (!this.isConfigured || razorpayOrderId.startsWith('order_mock_')) {
      logger.info('Verified simulated Razorpay test payment signature', {
        razorpayOrderId,
        razorpayPaymentId,
      });
      return true;
    }

    if (!razorpaySignature) {
      return false;
    }

    try {
      const body = `${razorpayOrderId}|${razorpayPaymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.keySecret)
        .update(body)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(razorpaySignature, 'utf8'),
        Buffer.from(expectedSignature, 'utf8')
      );
    } catch (err) {
      logger.error('Razorpay payment signature verification error', { error: err.message });
      return false;
    }
  }
}

export const razorpayClient = new RazorpayClient();

