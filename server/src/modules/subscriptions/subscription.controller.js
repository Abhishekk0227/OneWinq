import { subscriptionService } from './subscription.service.js';
import { checkoutSchema, cancelSubscriptionSchema } from './subscription.validation.js';
import { sendSuccess } from '../../shared/response.js';
import { HTTP } from '../../config/constants.js';

export class SubscriptionController {
  /**
   * GET /api/v1/subscriptions/plans
   * Public — returns all active subscription plans.
   */
  async getPlans(req, res, next) {
    try {
      const plans = await subscriptionService.getPlans();
      return sendSuccess(res, HTTP.OK, 'Plans retrieved successfully', { plans });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * GET /api/v1/subscriptions/me
   * Authenticated — returns current user's subscription and entitlements.
   */
  async getMySubscription(req, res, next) {
    try {
      const data = await subscriptionService.getCurrentSubscription(req.user.id);
      return sendSuccess(res, HTTP.OK, 'Subscription retrieved successfully', data);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * POST /api/v1/subscriptions/checkout
   * Authenticated — creates a checkout session for subscribing.
   */
  async createCheckout(req, res, next) {
    try {
      const parsed = checkoutSchema.parse(req.body);
      const session = await subscriptionService.createCheckoutSession(req.user.id, parsed);
      return sendSuccess(res, HTTP.CREATED, 'Checkout session created', session);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * POST /api/v1/subscriptions/cancel
   * Authenticated — cancels the active subscription.
   */
  async cancel(req, res, next) {
    try {
      const parsed = cancelSubscriptionSchema.parse(req.body || {});
      const subscription = await subscriptionService.cancelSubscription(req.user.id, parsed);
      return sendSuccess(res, HTTP.OK, 'Subscription cancelled successfully', { subscription });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * POST /api/v1/subscriptions/resume
   * Authenticated — resumes subscription scheduled for cancellation at period end.
   */
  async resume(req, res, next) {
    try {
      const subscription = await subscriptionService.resumeSubscription(req.user.id);
      return sendSuccess(res, HTTP.OK, 'Subscription resumed successfully', { subscription });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * POST /api/v1/subscriptions/webhook
   * Public — Razorpay webhook event receiver.
   */
  async handleWebhook(req, res, next) {
    try {
      const signature = req.headers['x-razorpay-signature'];
      const rawBody = req.rawBody || JSON.stringify(req.body);
      const result = await subscriptionService.handleWebhook(req.body, signature, rawBody);
      return sendSuccess(res, HTTP.OK, 'Webhook processed', result);
    } catch (err) {
      return next(err);
    }
  }
}

export const subscriptionController = new SubscriptionController();
