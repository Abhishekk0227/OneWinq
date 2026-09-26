import { Plan } from './plan.model.js';
import { Subscription } from './subscription.model.js';
import { User } from '../users/user.model.js';
import { razorpayClient } from '../../infrastructure/payment/razorpayClient.js';
import { entitlementService } from './entitlement.service.js';
import { eventBus } from '../../events/eventBus.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../shared/errors.js';
import {
  PLAN_TIER,
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_GATEWAY,
  APP_EVENT,
  ERROR_CODE,
  HTTP,
} from '../../config/constants.js';

class SubscriptionService {
  /**
   * Returns list of public active plans with feature matrices and pricing.
   * Initializes default plans in DB if not yet seeded.
   */
  async getPlans() {
    let plans = await Plan.find({ isActive: true, isPublic: true }).sort({ sortOrder: 1 });

    if (!plans || plans.length === 0) {
      // Seed default plans
      const defaults = Plan.getDefaultPlans();
      try {
        await Plan.insertMany(defaults, { ordered: false });
      } catch {
        // Ignore duplicate key errors if race condition
      }
      plans = await Plan.find({ isActive: true, isPublic: true }).sort({ sortOrder: 1 });
    }

    return plans;
  }

  /**
   * Retrieves the current user's active subscription status and resolved entitlements.
   * @param {string|mongoose.Types.ObjectId} userId
   */
  async getCurrentSubscription(userId) {
    const entitlements = await entitlementService.getEntitlements(userId);
    const subscription = await Subscription.findOne({ userId })
      .sort({ updatedAt: -1, createdAt: -1 });

    return {
      subscription: subscription || null,
      entitlements,
    };
  }

  /**
   * Initiates a checkout session for subscribing to a plan.
   * @param {string|mongoose.Types.ObjectId} userId
   * @param {object} input
   * @param {string} input.planCode
   * @param {string} input.billingCycle
   */
  async createCheckoutSession(userId, { planCode, billingCycle }) {
    if (planCode === PLAN_TIER.FREE) {
      throw new AppError(
        'The Free tier does not require checkout.',
        ERROR_CODE.VALIDATION_ERROR,
        HTTP.BAD_REQUEST
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', ERROR_CODE.NOT_FOUND, HTTP.NOT_FOUND);
    }

    let plan = await Plan.findOne({ code: planCode });
    if (!plan) {
      const defaults = Plan.getDefaultPlans();
      plan = defaults.find((p) => p.code === planCode);
    }

    if (!plan) {
      throw new AppError('Plan not found', ERROR_CODE.NOT_FOUND, HTTP.NOT_FOUND);
    }

    const pricing = plan.pricing[billingCycle.toLowerCase()] || plan.pricing.monthly;
    const amount = pricing.amount;

    // Create session via Razorpay client
    const session = await razorpayClient.createSubscription({
      planCode,
      billingCycle,
      amountInRupees: amount,
      customerEmail: user.email,
    });

    // Save pending/incomplete subscription record
    let sub = await Subscription.findOne({ userId });
    if (!sub) {
      sub = new Subscription({
        userId,
        planCode,
        status: SUBSCRIPTION_STATUS.INCOMPLETE,
        billingCycle,
        gateway: SUBSCRIPTION_GATEWAY.RAZORPAY,
        gatewaySubscriptionId: session.id,
        currentPeriodStart: session.currentPeriodStart,
        currentPeriodEnd: session.currentPeriodEnd,
      });
    } else {
      sub.planCode = planCode;
      sub.status = SUBSCRIPTION_STATUS.INCOMPLETE;
      sub.billingCycle = billingCycle;
      sub.gateway = SUBSCRIPTION_GATEWAY.RAZORPAY;
      sub.gatewaySubscriptionId = session.id;
      sub.currentPeriodStart = session.currentPeriodStart;
      sub.currentPeriodEnd = session.currentPeriodEnd;
    }

    await sub.save();

    logger.info('Checkout session initiated', {
      userId,
      planCode,
      billingCycle,
      gatewaySubscriptionId: session.id,
    });

    return {
      gatewaySubscriptionId: session.id,
      checkoutUrl: session.shortUrl,
      planCode,
      billingCycle,
      amount,
      currency: pricing.currency || 'INR',
    };
  }

  /**
   * Cancels the active user subscription.
   * @param {string|mongoose.Types.ObjectId} userId
   * @param {object} options
   * @param {boolean} options.immediate
   * @param {string} [options.reason]
   */
  async cancelSubscription(userId, { immediate = false, reason = '' } = {}) {
    const sub = await Subscription.findOne({
      userId,
      status: { $in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIALING, SUBSCRIPTION_STATUS.PAST_DUE] },
    });

    if (!sub || sub.planCode === PLAN_TIER.FREE) {
      throw new AppError(
        'No active paid subscription found to cancel',
        ERROR_CODE.NOT_FOUND,
        HTTP.NOT_FOUND
      );
    }

    if (sub.gatewaySubscriptionId) {
      await razorpayClient.cancelSubscription(sub.gatewaySubscriptionId, !immediate);
    }

    const now = new Date();
    if (immediate) {
      sub.status = SUBSCRIPTION_STATUS.CANCELLED;
      sub.canceledAt = now;
      sub.cancelAtPeriodEnd = false;
    } else {
      sub.cancelAtPeriodEnd = true;
      sub.canceledAt = now;
    }

    if (reason) {
      sub.metadata = { ...sub.metadata, cancellationReason: reason };
    }

    await sub.save();

    eventBus.emit(APP_EVENT.SUBSCRIPTION_CANCELLED, {
      userId,
      subscriptionId: sub._id,
      planCode: sub.planCode,
      immediate,
    });

    if (immediate) {
      eventBus.emit(APP_EVENT.ENTITLEMENT_REVOKED, {
        userId,
        planCode: sub.planCode,
      });
    }

    logger.info('Subscription cancelled', {
      userId,
      planCode: sub.planCode,
      immediate,
    });

    return sub;
  }

  /**
   * Resumes a subscription scheduled for cancellation at period end.
   * @param {string|mongoose.Types.ObjectId} userId
   */
  async resumeSubscription(userId) {
    const sub = await Subscription.findOne({
      userId,
      cancelAtPeriodEnd: true,
      status: SUBSCRIPTION_STATUS.ACTIVE,
    });

    if (!sub) {
      throw new AppError(
        'No pending cancellation found to resume',
        ERROR_CODE.VALIDATION_ERROR,
        HTTP.BAD_REQUEST
      );
    }

    sub.cancelAtPeriodEnd = false;
    sub.canceledAt = null;
    await sub.save();

    logger.info('Subscription cancellation reverted', { userId, planCode: sub.planCode });
    return sub;
  }

  /**
   * Processes incoming webhook event payload from Razorpay.
   * @param {object} payload - Parsed webhook payload
   * @param {string} signature - x-razorpay-signature header
   * @param {string|Buffer} rawBody - Raw body buffer/string
   */
  async handleWebhook(payload, signature, rawBody) {
    const isValid = razorpayClient.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      logger.warn('Razorpay webhook signature verification failed');
      throw new AppError(
        'Invalid webhook signature',
        ERROR_CODE.WEBHOOK_INVALID,
        HTTP.BAD_REQUEST
      );
    }

    const event = payload.event;
    logger.info('Processing Razorpay webhook event', { event });

    const entity = payload.payload?.subscription?.entity || payload.payload?.payment?.entity;
    const subId = entity?.subscription_id || entity?.id;

    if (!subId) {
      return { processed: true, ignored: true, reason: 'No subscription ID in event' };
    }

    const sub = await Subscription.findOne({ gatewaySubscriptionId: subId });
    if (!sub) {
      logger.warn('Webhook received for untracked subscription ID', { subId, event });
      return { processed: true, ignored: true, reason: 'Subscription not found in DB' };
    }

    switch (event) {
      case 'subscription.authenticated':
      case 'subscription.activated': {
        sub.status = SUBSCRIPTION_STATUS.ACTIVE;
        sub.currentPeriodStart = entity.current_start
          ? new Date(entity.current_start * 1000)
          : new Date();
        sub.currentPeriodEnd = entity.current_end
          ? new Date(entity.current_end * 1000)
          : new Date(Date.now() + 30 * 86400000);
        sub.cancelAtPeriodEnd = false;
        sub.paymentFailedAt = null;
        await sub.save();

        eventBus.emit(APP_EVENT.SUBSCRIPTION_ACTIVATED, {
          userId: sub.userId,
          subscriptionId: sub._id,
          planCode: sub.planCode,
        });

        eventBus.emit(APP_EVENT.ENTITLEMENT_GRANTED, {
          userId: sub.userId,
          planCode: sub.planCode,
        });
        break;
      }

      case 'subscription.charged': {
        sub.status = SUBSCRIPTION_STATUS.ACTIVE;
        if (entity.current_end) {
          sub.currentPeriodEnd = new Date(entity.current_end * 1000);
        }
        sub.paymentFailedAt = null;
        await sub.save();

        eventBus.emit(APP_EVENT.SUBSCRIPTION_RENEWED, {
          userId: sub.userId,
          subscriptionId: sub._id,
          planCode: sub.planCode,
        });
        break;
      }

      case 'subscription.halted':
      case 'payment.failed': {
        sub.status = SUBSCRIPTION_STATUS.PAST_DUE;
        sub.paymentFailedAt = new Date();
        await sub.save();

        eventBus.emit(APP_EVENT.SUBSCRIPTION_PAST_DUE, {
          userId: sub.userId,
          subscriptionId: sub._id,
          planCode: sub.planCode,
        });
        break;
      }

      case 'subscription.cancelled': {
        sub.status = SUBSCRIPTION_STATUS.CANCELLED;
        sub.canceledAt = new Date();
        await sub.save();

        eventBus.emit(APP_EVENT.SUBSCRIPTION_CANCELLED, {
          userId: sub.userId,
          subscriptionId: sub._id,
          planCode: sub.planCode,
          immediate: true,
        });

        eventBus.emit(APP_EVENT.ENTITLEMENT_REVOKED, {
          userId: sub.userId,
          planCode: sub.planCode,
        });
        break;
      }

      default:
        logger.info('Unhandled Razorpay webhook event', { event });
        break;
    }

    return { processed: true, event };
  }
}

export const subscriptionService = new SubscriptionService();
