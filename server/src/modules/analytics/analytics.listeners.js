import { eventBus } from '../../events/eventBus.js';
import { APP_EVENT } from '../../config/constants.js';
import { analyticsService } from './analytics.service.js';
import logger from '../../utils/logger.js';

let listenersInitialized = false;

export function initAnalyticsListeners() {
  if (listenersInitialized) {
    return;
  }
  listenersInitialized = true;

  // 1. Profile Viewed
  eventBus.subscribe(APP_EVENT.PROFILE_VIEWED, async (payload) => {
    try {
      const { profileUserId, viewerId, ip, userAgent } = payload;
      if (!profileUserId) {
        return;
      }

      await analyticsService.recordEvent({
        eventType: 'profile.viewed',
        targetUserId: profileUserId,
        actorUserId: viewerId || null,
        ip,
        userAgent,
      });
    } catch (err) {
      logger.error('Failed to process PROFILE_VIEWED analytics listener', { error: err.message });
    }
  });

  // 2. Card Tapped
  eventBus.subscribe(APP_EVENT.CARD_TAPPED, async (payload) => {
    try {
      const { cardUid, userId, ip, userAgent } = payload;
      if (!userId) {
        return;
      }

      await analyticsService.recordEvent({
        eventType: 'card.tapped',
        targetUserId: userId,
        cardUid,
        ip,
        userAgent,
      });
    } catch (err) {
      logger.error('Failed to process CARD_TAPPED analytics listener', { error: err.message });
    }
  });

  // 3. QR Scanned
  eventBus.subscribe(APP_EVENT.QR_SCANNED, async (payload) => {
    try {
      const { cardUid, userId, ip, userAgent } = payload;
      if (!userId) {
        return;
      }

      await analyticsService.recordEvent({
        eventType: 'qr.scanned',
        targetUserId: userId,
        cardUid,
        ip,
        userAgent,
      });
    } catch (err) {
      logger.error('Failed to process QR_SCANNED analytics listener', { error: err.message });
    }
  });

  // 4. Connection Request Sent
  eventBus.subscribe(APP_EVENT.CONNECTION_REQUEST_SENT, async (payload) => {
    try {
      const { fromUserId, toUserId } = payload;
      if (!toUserId) {
        return;
      }

      await analyticsService.recordEvent({
        eventType: 'connection.request_sent',
        targetUserId: toUserId,
        actorUserId: fromUserId,
      });
    } catch (err) {
      logger.error('Failed to process CONNECTION_REQUEST_SENT analytics listener', {
        error: err.message,
      });
    }
  });

  // 5. Connection Accepted
  eventBus.subscribe(APP_EVENT.CONNECTION_ACCEPTED, async (payload) => {
    try {
      const { acceptedBy, requesterId } = payload;
      if (!requesterId) {
        return;
      }

      await analyticsService.recordEvent({
        eventType: 'connection.accepted',
        targetUserId: requesterId,
        actorUserId: acceptedBy,
      });
    } catch (err) {
      logger.error('Failed to process CONNECTION_ACCEPTED analytics listener', {
        error: err.message,
      });
    }
  });

  logger.info('Analytics event listeners initialized');
}
