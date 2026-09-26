import { eventBus } from '../../events/eventBus.js';
import { APP_EVENT, NOTIFICATION_TYPE } from '../../config/constants.js';
import { notificationService } from '../notifications/notification.service.js';
import { logger } from '../../utils/logger.js';

/**
 * Initializes event listeners for subscription lifecycle events.
 */
export function initSubscriptionListeners() {
  eventBus.on(APP_EVENT.SUBSCRIPTION_ACTIVATED, async (data) => {
    try {
      const { userId, planCode } = data;
      await notificationService.createNotification({
        recipient: userId,
        actor: null,
        type: NOTIFICATION_TYPE.SUBSCRIPTION_UPDATE,
        title: `Welcome to OneWinq ${planCode}!`,
        body: `Your subscription to the ${planCode} plan is now active. Enjoy higher limits and premium features.`,
        entityType: 'Subscription',
        metadata: { planCode },
      });
    } catch (err) {
      logger.error('Failed to dispatch SUBSCRIPTION_ACTIVATED notification', { error: err.message });
    }
  });

  eventBus.on(APP_EVENT.SUBSCRIPTION_RENEWED, async (data) => {
    try {
      const { userId, planCode } = data;
      await notificationService.createNotification({
        recipient: userId,
        actor: null,
        type: NOTIFICATION_TYPE.SUBSCRIPTION_UPDATE,
        title: `Subscription Renewed`,
        body: `Your OneWinq ${planCode} subscription was successfully renewed.`,
        entityType: 'Subscription',
        metadata: { planCode },
      });
    } catch (err) {
      logger.error('Failed to dispatch SUBSCRIPTION_RENEWED notification', { error: err.message });
    }
  });

  eventBus.on(APP_EVENT.SUBSCRIPTION_PAST_DUE, async (data) => {
    try {
      const { userId, planCode } = data;
      await notificationService.createNotification({
        recipient: userId,
        actor: null,
        type: NOTIFICATION_TYPE.SECURITY_ALERT,
        title: `Payment Failed`,
        body: `We were unable to process payment for your ${planCode} plan. Please update your payment details to avoid disruption.`,
        entityType: 'Subscription',
        metadata: { planCode, isPastDue: true },
      });
    } catch (err) {
      logger.error('Failed to dispatch SUBSCRIPTION_PAST_DUE notification', { error: err.message });
    }
  });

  eventBus.on(APP_EVENT.SUBSCRIPTION_CANCELLED, async (data) => {
    try {
      const { userId, planCode, immediate } = data;
      const body = immediate
        ? `Your OneWinq ${planCode} subscription was cancelled.`
        : `Your OneWinq ${planCode} subscription is scheduled for cancellation at the end of the billing cycle.`;

      await notificationService.createNotification({
        recipient: userId,
        actor: null,
        type: NOTIFICATION_TYPE.SUBSCRIPTION_UPDATE,
        title: `Subscription Cancelled`,
        body,
        entityType: 'Subscription',
        metadata: { planCode, immediate },
      });
    } catch (err) {
      logger.error('Failed to dispatch SUBSCRIPTION_CANCELLED notification', { error: err.message });
    }
  });

  logger.info('Subscription event listeners initialized');
}
