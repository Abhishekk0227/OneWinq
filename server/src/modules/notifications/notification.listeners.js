import { eventBus } from '../../events/eventBus.js';
import { APP_EVENT, NOTIFICATION_TYPE } from '../../config/constants.js';
import { notificationService } from './notification.service.js';
import { User } from '../users/user.model.js';
import { Report } from '../moderation/report.model.js';
import { Ticket } from '../support/ticket.model.js';
import { getOrCreateProfile } from '../profiles/profile.service.js';
import logger from '../../utils/logger.js';

let listenersInitialized = false;

export function initNotificationListeners() {
  if (listenersInitialized) {
    return;
  }
  listenersInitialized = true;

  // 1. Connection Request Sent
  eventBus.subscribe(APP_EVENT.CONNECTION_REQUEST_SENT, async (payload) => {
    try {
      const { relationshipId, fromUserId, toUserId } = payload;
      const sender = await User.findById(fromUserId).select('displayName username avatarUrl').lean();
      const senderName = sender?.displayName || sender?.username || 'Someone';

      await notificationService.createNotification({
        recipientId: toUserId,
        actorId: fromUserId,
        type: NOTIFICATION_TYPE.CONNECTION_REQUEST,
        title: 'New Connection Request',
        body: `${senderName} sent you a connection request.`,
        entityType: 'connection',
        entityId: relationshipId,
        linkUrl: '/app/connections',
        metadata: {
          username: sender?.username,
          displayName: sender?.displayName,
          avatarUrl: sender?.avatarUrl,
        },
      });
    } catch (err) {
      logger.error('Failed to process CONNECTION_REQUEST_SENT listener', { error: err.message });
    }
  });

  // 2. Connection Accepted
  eventBus.subscribe(APP_EVENT.CONNECTION_ACCEPTED, async (payload) => {
    try {
      const { relationshipId, acceptedBy, requesterId } = payload;
      const accepter = await User.findById(acceptedBy).select('displayName username avatarUrl').lean();
      const accepterName = accepter?.displayName || accepter?.username || 'Someone';

      await notificationService.createNotification({
        recipientId: requesterId,
        actorId: acceptedBy,
        type: NOTIFICATION_TYPE.CONNECTION_ACCEPTED,
        title: 'Connection Accepted',
        body: `${accepterName} accepted your connection request.`,
        entityType: 'connection',
        entityId: relationshipId,
        linkUrl: accepter?.username ? `/u/${accepter.username}` : '/app/connections',
        metadata: {
          username: accepter?.username,
          displayName: accepter?.displayName,
          avatarUrl: accepter?.avatarUrl,
        },
      });
    } catch (err) {
      logger.error('Failed to process CONNECTION_ACCEPTED listener', { error: err.message });
    }
  });

  // 3. Profile Viewed
  eventBus.subscribe(APP_EVENT.PROFILE_VIEWED, async (payload) => {
    try {
      const { profileUserId, viewerId } = payload;
      if (!viewerId || String(viewerId) === String(profileUserId)) {
        return;
      }

      const viewer = await User.findById(viewerId).select('displayName username avatarUrl').lean();
      const viewerName = viewer?.displayName || viewer?.username || 'Someone';

      await notificationService.createNotification({
        recipientId: profileUserId,
        actorId: viewerId,
        type: NOTIFICATION_TYPE.PROFILE_VIEW,
        title: 'Profile Viewed',
        body: `${viewerName} viewed your profile.`,
        entityType: 'profile',
        entityId: profileUserId,
        linkUrl: viewer?.username ? `/u/${viewer.username}` : '/app/analytics',
        metadata: {
          username: viewer?.username,
          displayName: viewer?.displayName,
        },
      });
    } catch (err) {
      logger.error('Failed to process PROFILE_VIEWED listener', { error: err.message });
    }
  });

  // 4. Message Sent
  eventBus.subscribe(APP_EVENT.MESSAGE_SENT, async (payload) => {
    try {
      const { conversationId, senderId, recipientId, preview } = payload;
      if (String(senderId) === String(recipientId)) return;

      const sender = await User.findById(senderId).select('displayName username avatarUrl').lean();
      const senderName = sender?.displayName || sender?.username || 'Someone';

      const snippet = preview ? `: "${preview.length > 50 ? preview.slice(0, 47) + '...' : preview}"` : '.';

      await notificationService.createNotification({
        recipientId,
        actorId: senderId,
        type: NOTIFICATION_TYPE.NEW_MESSAGE,
        title: 'New Message',
        body: `${senderName} sent you a message${snippet}`,
        entityType: 'conversation',
        entityId: conversationId,
        linkUrl: `/app/messages?cid=${conversationId}`,
        metadata: {
          conversationId,
          username: sender?.username,
          displayName: sender?.displayName,
        },
      });
    } catch (err) {
      logger.error('Failed to process MESSAGE_SENT listener', { error: err.message });
    }
  });

  // 5. Smart Card Linked Successfully (NFC Card Activation)
  eventBus.subscribe(APP_EVENT.CARD_ACTIVATED, async (payload) => {
    try {
      const { cardCode, cardUid, userId, orderNumber } = payload;
      const code = cardCode || cardUid || 'NFC-CARD';

      // Card-first identity: ensure the user has a draft profile ready to fill in.
      // This is non-blocking — the card is already activated even if this fails.
      try {
        await getOrCreateProfile(userId);
        logger.info('Draft profile initialized on card activation', { userId, cardCode: code });
      } catch (profileErr) {
        logger.warn('Could not initialize draft profile on card activation', {
          userId,
          cardCode: code,
          error: profileErr.message,
        });
      }

      await notificationService.createNotification({
        recipientId: userId,
        type: NOTIFICATION_TYPE.CARD_ACTIVATED,
        title: 'Smart Card Linked Successfully! 💳',
        body: `Physical NFC Card (${code}) has been bound to your account and is now active.${orderNumber ? ` (Order #${orderNumber})` : ''} Complete your profile to go live.`,
        entityType: 'card',
        entityId: code,
        linkUrl: '/app/profile',
        metadata: {
          cardCode: code,
          orderNumber,
        },
      });
    } catch (err) {
      logger.error('Failed to process CARD_ACTIVATED listener', { error: err.message });
    }
  });

  // 6. Hardware Order Placed
  eventBus.subscribe(APP_EVENT.ORDER_CREATED, async (payload) => {
    try {
      const { orderId, orderNumber, userId, totalAmount } = payload;
      const amountInRupees = totalAmount > 5000 ? Math.round(totalAmount / 100) : totalAmount;

      await notificationService.createNotification({
        recipientId: userId,
        type: NOTIFICATION_TYPE.ORDER_UPDATE,
        title: 'Card Order Placed 📦',
        body: `Order #${orderNumber} placed (Total: ₹${amountInRupees.toLocaleString('en-IN')}). Complete payment to initiate crafting.`,
        entityType: 'order',
        entityId: orderId,
        linkUrl: '/app/orders',
        metadata: {
          orderId,
          orderNumber,
          totalAmount,
        },
      });
    } catch (err) {
      logger.error('Failed to process ORDER_CREATED listener', { error: err.message });
    }
  });

  // 7. Order Payment Confirmed
  eventBus.subscribe(APP_EVENT.ORDER_PAID, async (payload) => {
    try {
      const { orderId, orderNumber, userId, totalAmount, razorpayPaymentId } = payload;
      const amountInRupees = totalAmount > 5000 ? Math.round(totalAmount / 100) : totalAmount;

      await notificationService.createNotification({
        recipientId: userId,
        type: NOTIFICATION_TYPE.ORDER_UPDATE,
        title: 'Payment Successful! 🎉',
        body: `Payment for Order #${orderNumber} (₹${amountInRupees.toLocaleString('en-IN')}) verified. Your card is now in provisioning.`,
        entityType: 'order',
        entityId: orderId,
        linkUrl: '/app/orders',
        metadata: {
          orderId,
          orderNumber,
          razorpayPaymentId,
        },
      });
    } catch (err) {
      logger.error('Failed to process ORDER_PAID listener', { error: err.message });
    }
  });

  // 8. Order Shipped / Delivered / Status Update
  const handleOrderStatusUpdate = async (payload) => {
    try {
      const { orderId, orderNumber, userId, state, carrier, trackingNumber } = payload;
      if (!userId) return;

      const isDelivered = state === 'DELIVERED';
      const isShipped = state === 'SHIPPED';

      const title = isDelivered
        ? 'Order Delivered! 📬'
        : isShipped
          ? 'Card Order Shipped! 🚚'
          : `Order Status: ${state}`;

      const trackingText = trackingNumber ? ` with ${carrier || 'courier'} (Tracking: ${trackingNumber})` : '';
      const body = isDelivered
        ? `Your physical smart card for Order #${orderNumber} has been delivered!`
        : `Your Order #${orderNumber} has been updated to ${state}${trackingText}.`;

      await notificationService.createNotification({
        recipientId: userId,
        type: NOTIFICATION_TYPE.ORDER_UPDATE,
        title,
        body,
        entityType: 'order',
        entityId: orderId,
        linkUrl: '/app/orders',
        metadata: {
          orderId,
          orderNumber,
          state,
          carrier,
          trackingNumber,
        },
      });
    } catch (err) {
      logger.error('Failed to process order status update listener', { error: err.message });
    }
  };

  eventBus.subscribe(APP_EVENT.ORDER_SHIPPED, handleOrderStatusUpdate);
  eventBus.subscribe(APP_EVENT.ORDER_DELIVERED, handleOrderStatusUpdate);
  eventBus.subscribe(APP_EVENT.ORDER_STATUS_CHANGED, handleOrderStatusUpdate);

  // 9. Moderation Report Resolved
  eventBus.subscribe(APP_EVENT.REPORT_RESOLVED, async (payload) => {
    try {
      const { reportId, status, actionTaken } = payload;
      const report = await Report.findById(reportId).lean();
      if (!report || !report.reporter) return;

      await notificationService.createNotification({
        recipientId: report.reporter,
        type: NOTIFICATION_TYPE.REPORT_RESPONSE,
        title: 'Report Update 🛡️',
        body: `Your report regarding a ${report.targetType?.toLowerCase() || 'content'} has been reviewed (Status: ${status}, Action: ${actionTaken || 'None'}).`,
        entityType: 'report',
        entityId: reportId,
        linkUrl: '/app/settings',
        metadata: {
          reportId,
          status,
          actionTaken,
        },
      });
    } catch (err) {
      logger.error('Failed to process REPORT_RESOLVED listener', { error: err.message });
    }
  });

  // 10. Support Ticket Response
  eventBus.subscribe(APP_EVENT.TICKET_REPLIED, async (payload) => {
    try {
      const { ticketId, ticketNumber, senderRole } = payload;
      if (senderRole === 'USER') {
        // User replied; no need to notify themselves
        return;
      }

      const ticket = await Ticket.findById(ticketId).lean();
      const recipientId = ticket?.userId || ticket?.user;
      if (!ticket || !recipientId) return;

      await notificationService.createNotification({
        recipientId,
        type: NOTIFICATION_TYPE.TICKET_RESPONSE,
        title: 'Support Ticket Reply 💬',
        body: `A support agent replied to your ticket #${ticketNumber}.`,
        entityType: 'ticket',
        entityId: ticketId,
        linkUrl: '/app/support',
        metadata: {
          ticketId,
          ticketNumber,
        },
      });
    } catch (err) {
      logger.error('Failed to process TICKET_REPLIED listener', { error: err.message });
    }
  });

  // 11. Support Ticket Closed
  eventBus.subscribe(APP_EVENT.TICKET_CLOSED, async (payload) => {
    try {
      const { ticketId, ticketNumber } = payload;
      const ticket = await Ticket.findById(ticketId).lean();
      const recipientId = ticket?.userId || ticket?.user;
      if (!ticket || !recipientId) return;

      await notificationService.createNotification({
        recipientId,
        type: NOTIFICATION_TYPE.TICKET_RESPONSE,
        title: 'Support Ticket Resolved ✅',
        body: `Your support ticket #${ticketNumber} has been resolved and closed.`,
        entityType: 'ticket',
        entityId: ticketId,
        linkUrl: '/app/support',
        metadata: {
          ticketId,
          ticketNumber,
        },
      });
    } catch (err) {
      logger.error('Failed to process TICKET_CLOSED listener', { error: err.message });
    }
  });

  // 12. Post Liked
  eventBus.subscribe(APP_EVENT.POST_LIKED, async (payload) => {
    try {
      const { postId, authorId, likerId } = payload;
      if (String(authorId) === String(likerId)) return;

      const liker = await User.findById(likerId).select('displayName username avatarUrl').lean();
      const likerName = liker?.displayName || liker?.username || 'Someone';

      await notificationService.createNotification({
        recipientId: authorId,
        actorId: likerId,
        type: NOTIFICATION_TYPE.POST_LIKE,
        title: 'New Like on Your Post ❤️',
        body: `${likerName} liked your post.`,
        entityType: 'post',
        entityId: postId,
        linkUrl: `/app?postId=${postId}`,
        metadata: {
          postId,
          username: liker?.username,
          displayName: liker?.displayName,
          avatarUrl: liker?.avatarUrl,
        },
      });
    } catch (err) {
      logger.error('Failed to process POST_LIKED listener', { error: err.message });
    }
  });

  // 13. Post Commented
  eventBus.subscribe(APP_EVENT.POST_COMMENTED, async (payload) => {
    try {
      const { postId, authorId, commenterId, content } = payload;
      if (String(authorId) === String(commenterId)) return;

      const commenter = await User.findById(commenterId).select('displayName username avatarUrl').lean();
      const commenterName = commenter?.displayName || commenter?.username || 'Someone';
      const snippet = content && content.length > 50 ? content.slice(0, 47) + '...' : (content || '');

      await notificationService.createNotification({
        recipientId: authorId,
        actorId: commenterId,
        type: NOTIFICATION_TYPE.POST_COMMENT,
        title: 'New Comment on Your Post 💬',
        body: `${commenterName} commented: "${snippet}"`,
        entityType: 'post',
        entityId: postId,
        linkUrl: `/app?postId=${postId}`,
        metadata: {
          postId,
          username: commenter?.username,
          displayName: commenter?.displayName,
          avatarUrl: commenter?.avatarUrl,
        },
      });
    } catch (err) {
      logger.error('Failed to process POST_COMMENTED listener', { error: err.message });
    }
  });

  logger.info('Notification event listeners fully initialized for messages, orders, cards, reports, tickets & posts');
}
