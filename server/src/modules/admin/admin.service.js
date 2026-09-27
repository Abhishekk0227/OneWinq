import crypto from 'crypto';
import { User } from '../users/user.model.js';
import { CardBatch } from '../cards/cardBatch.model.js';
import { Card } from '../cards/card.model.js';
import { CardCounter, getNextCardSequenceBlock } from '../cards/cardCounter.model.js';
import { Order } from '../cards/order.model.js';
import { hashPassword } from '../auth/passwordService.js';
import { Subscription } from '../subscriptions/subscription.model.js';
import { Report } from '../moderation/report.model.js';
import { Ticket } from '../support/ticket.model.js';
import { AuditLog } from './auditLog.model.js';
import { Session } from '../auth/session.model.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../shared/errors.js';
import {
  ACCOUNT_STATE,
  CARD_STATE,
  ORDER_STATE,
  SUBSCRIPTION_STATUS,
  REPORT_STATE,
  TICKET_STATE,
  ERROR_CODE,
  HTTP,
  APP_EVENT,
} from '../../config/constants.js';
import { eventBus } from '../../events/eventBus.js';

class AdminService {
  /**
   * Searches and filters platform users.
   * @param {object} params
   */
  async listUsers({ q, accountState, role, limit = 20, cursor = null } = {}) {
    const query = {};

    if (q) {
      const sanitized = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(sanitized, 'i');
      query.$or = [{ email: regex }, { username: regex }, { displayName: regex }];
    }

    if (accountState) {
      query.accountState = accountState;
    }

    if (role) {
      query.role = role;
    }

    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    const pageSize = Math.min(Number(limit) || 20, 100);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .limit(pageSize + 1);

    const hasMore = users.length > pageSize;
    const results = hasMore ? users.slice(0, pageSize) : users;
    const nextCursor = hasMore ? results[results.length - 1].createdAt.toISOString() : null;

    return {
      users: results.map((u) => {
        const obj = u.toObject ? u.toObject() : u;
        return {
          ...obj,
          id: obj._id ? obj._id.toString() : obj.id,
        };
      }),
      pagination: {
        hasMore,
        nextCursor,
      },
    };
  }

  /**
   * Changes account state (suspend, reactivate, deactivate) and writes to audit trail.
   * @param {string|mongoose.Types.ObjectId} adminId
   * @param {string|mongoose.Types.ObjectId} targetUserId
   * @param {object} input
   * @param {object} meta
   */
  async updateUserStatus(adminId, targetUserId, { status, reason }, meta = {}) {
    if (adminId.toString() === targetUserId.toString()) {
      throw new AppError(
        'You cannot modify your own administrative account status.',
        ERROR_CODE.VALIDATION_ERROR,
        HTTP.BAD_REQUEST
      );
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      throw new AppError('Target user not found', ERROR_CODE.NOT_FOUND, HTTP.NOT_FOUND);
    }

    const previousStatus = user.accountState;
    user.accountState = status;
    await user.save();

    // Revoke sessions if suspended or deactivated
    if (status === ACCOUNT_STATE.SUSPENDED || status === ACCOUNT_STATE.DEACTIVATED) {
      await Session.updateMany({ userId: targetUserId }, { isRevoked: true });
    }

    await AuditLog.create({
      adminId,
      action: `USER_STATUS_${status}`,
      targetType: 'USER',
      targetId: targetUserId.toString(),
      ipAddress: meta.ip || '',
      userAgent: meta.userAgent || '',
      details: {
        previousStatus,
        newStatus: status,
        reason,
        targetEmail: user.email,
        targetUsername: user.username,
      },
    });

    logger.info('User account state modified by administrator', {
      adminId,
      targetUserId,
      previousStatus,
      newStatus: status,
    });

    return user;
  }

  /**
   * Changes the admin role of a user and writes to audit trail.
   * @param {string|mongoose.Types.ObjectId} adminId
   * @param {string|mongoose.Types.ObjectId} targetUserId
   * @param {object} input
   * @param {object} meta
   */
  async updateUserRole(adminId, targetUserId, { role }, meta = {}) {
    if (adminId.toString() === targetUserId.toString()) {
      throw new AppError(
        'You cannot modify your own role.',
        ERROR_CODE.VALIDATION_ERROR,
        HTTP.BAD_REQUEST
      );
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      throw new AppError('Target user not found', ERROR_CODE.NOT_FOUND, HTTP.NOT_FOUND);
    }

    const previousRole = user.role;
    user.role = role;
    await user.save();

    await AuditLog.create({
      adminId,
      action: 'USER_ROLE_CHANGED',
      targetType: 'USER',
      targetId: targetUserId.toString(),
      ipAddress: meta.ip || '',
      userAgent: meta.userAgent || '',
      details: {
        previousRole,
        newRole: role,
        targetEmail: user.email,
        targetUsername: user.username,
      },
    });

    logger.info('User role modified by administrator', {
      adminId,
      targetUserId,
      previousRole,
      newRole: role,
    });

    return user;
  }

  /**
   * Provisions a new hardware card manufacturing batch with unique UIDs and secret hashes.
   * @param {string|mongoose.Types.ObjectId} adminId
   * @param {object} input
   * @param {object} meta
   */
  async createHardwareBatch(adminId, { batchNumber, cardType, totalCards }, meta = {}) {
    const existing = await CardBatch.findOne({ batchNumber });
    if (existing) {
      throw new AppError(
        `Batch number '${batchNumber}' already exists.`,
        ERROR_CODE.CONFLICT,
        HTTP.CONFLICT
      );
    }

    const batch = new CardBatch({
      batchNumber,
      cardType,
      totalCards,
      manufactureDate: new Date(),
    });
    await batch.save();

    // Bulk generate cards
    const cardDocs = [];
    const edition = (cardType || 'PVC').toUpperCase();
    for (let i = 0; i < totalCards; i++) {
      const cardCode = `OWQ-${edition}-${crypto
        .randomBytes(4)
        .toString('hex')
        .toUpperCase()}`;
      const activationSecret = crypto.randomBytes(6).toString('hex').toUpperCase();
      const secretHash = await hashPassword(activationSecret);

      cardDocs.push({
        cardCode,
        cardUid: cardCode,
        batchNumber,
        cardType,
        edition,
        material: cardType.toLowerCase(),
        secretHash,
        state: CARD_STATE.UNASSIGNED,
        status: CARD_STATE.UNASSIGNED,
        hasBeenTransferred: false,
        transferCount: 0,
      });
    }

    await Card.insertMany(cardDocs, { ordered: false });

    await AuditLog.create({
      adminId,
      action: 'CARD_BATCH_CREATED',
      targetType: 'CARD_BATCH',
      targetId: batch._id.toString(),
      ipAddress: meta.ip || '',
      userAgent: meta.userAgent || '',
      details: {
        batchNumber,
        cardType,
        totalCards,
      },
    });

    logger.info('Hardware card batch provisioned', {
      adminId,
      batchNumber,
      cardType,
      totalCards,
    });

    return {
      batch,
      cardsGenerated: cardDocs.length,
    };
  }

  /**
   * Aggregates real-time system performance and business metrics.
   */
  async getSystemMetrics() {
    const [
      totalUsers,
      activeUsers,
      activeSubscriptions,
      totalCards,
      activeCards,
      unassignedCards,
      inactiveCards,
      blockedCards,
      openReports,
      openTickets,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ accountState: ACCOUNT_STATE.ACTIVE }),
      Subscription.countDocuments({ status: SUBSCRIPTION_STATUS.ACTIVE }),
      Card.countDocuments(),
      Card.countDocuments({ state: CARD_STATE.ACTIVE }),
      Card.countDocuments({ state: CARD_STATE.UNASSIGNED }),
      Card.countDocuments({ state: CARD_STATE.INACTIVE }),
      Card.countDocuments({ state: CARD_STATE.BLOCKED }),
      Report.countDocuments({ status: REPORT_STATE.OPEN }),
      Ticket.countDocuments({
        status: { $in: [TICKET_STATE.OPEN, TICKET_STATE.IN_PROGRESS, TICKET_STATE.WAITING_FOR_USER] },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
      },
      monetization: {
        activeSubscriptions,
      },
      hardware: {
        totalCards,
        activeCards,
        unassignedCards,
        inactiveCards,
        blockedCards,
      },
      moderation: {
        openReports,
      },
      support: {
        openTickets,
      },
    };
  }

  /**
   * Retrieves real-time card lifecycle breakdown metrics.
   */
  async getCardStats() {
    const [
      total,
      active,
      unassigned,
      inactive,
      blocked,
    ] = await Promise.all([
      Card.countDocuments(),
      Card.countDocuments({ state: CARD_STATE.ACTIVE }),
      Card.countDocuments({ state: CARD_STATE.UNASSIGNED }),
      Card.countDocuments({ state: CARD_STATE.INACTIVE }),
      Card.countDocuments({ state: CARD_STATE.BLOCKED }),
    ]);

    return {
      total,
      active,
      unassigned,
      inactive,
      blocked,
    };
  }

  /**
   * Queries audit trail history with cursor pagination.
   * @param {object} params
   */
  async getAuditLogs({ limit = 20, cursor = null, targetType = null } = {}) {
    const query = {};
    if (targetType) {
      query.targetType = targetType;
    }
    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    const pageSize = Math.min(Number(limit) || 20, 100);
    const logs = await AuditLog.find(query)
      .populate('adminId', 'displayName username email')
      .sort({ createdAt: -1 })
      .limit(pageSize + 1);

    const hasMore = logs.length > pageSize;
    const results = hasMore ? logs.slice(0, pageSize) : logs;
    const nextCursor = hasMore ? results[results.length - 1].createdAt.toISOString() : null;

    return {
      logs: results,
      pagination: {
        hasMore,
        nextCursor,
      },
    };
  }

  /**
   * List all abuse reports with filters.
   */
  async listReports({ status, targetType, limit = 20, cursor = null } = {}) {
    const query = {};
    if (status) {
      query.status = status;
    }
    if (targetType) {
      query.targetType = targetType;
    }
    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    const pageSize = Math.min(Number(limit) || 20, 50);
    const reports = await Report.find(query)
      .populate('reporter', 'displayName username email')
      .populate('reportedUser', 'displayName username email')
      .sort({ createdAt: -1 })
      .limit(pageSize + 1);

    const hasMore = reports.length > pageSize;
    const results = hasMore ? reports.slice(0, pageSize) : reports;
    const nextCursor = hasMore ? results[results.length - 1].createdAt.toISOString() : null;

    return {
      reports: results,
      pagination: {
        hasMore,
        nextCursor,
      },
    };
  }

  /**
   * Update report status (resolve or dismiss).
   */
  async resolveReport(adminId, reportId, { status, adminNotes, actionTaken }) {
    const report = await Report.findById(reportId);
    if (!report) {
      throw new AppError('Report not found', ERROR_CODE.NOT_FOUND, HTTP.NOT_FOUND);
    }

    report.status = status;
    report.reviewedBy = adminId;
    report.reviewedAt = new Date();
    if (adminNotes) {
      report.adminNotes = adminNotes;
    }
    if (actionTaken) {
      report.actionTaken = actionTaken;
    }
    await report.save();

    await AuditLog.create({
      adminId,
      action: `REPORT_${status}`,
      targetType: 'REPORT',
      targetId: reportId.toString(),
      reason: adminNotes || actionTaken || 'Report reviewed',
    });

    return report;
  }

  /**
   * List all support tickets across the platform.
   */
  async listTickets({ status, priority, limit = 20, cursor = null } = {}) {
    const query = {};
    if (status) {
      query.status = status;
    }
    if (priority) {
      query.priority = priority;
    }
    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    const pageSize = Math.min(Number(limit) || 20, 50);
    const tickets = await Ticket.find(query)
      .populate('userId', 'displayName username email')
      .populate('assignedTo', 'displayName username email')
      .sort({ createdAt: -1 })
      .limit(pageSize + 1);

    const hasMore = tickets.length > pageSize;
    const results = hasMore ? tickets.slice(0, pageSize) : tickets;
    const nextCursor = hasMore ? results[results.length - 1].createdAt.toISOString() : null;

    return {
      tickets: results,
      pagination: {
        hasMore,
        nextCursor,
      },
    };
  }

  /**
   * Update support ticket assignment, status, or reply as admin.
   */
  async updateTicket(adminId, ticketId, { status, assignedTo, internalNote, replyText }) {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      throw new AppError('Ticket not found', ERROR_CODE.NOT_FOUND, HTTP.NOT_FOUND);
    }

    if (status) {
      ticket.status = status;
    }
    if (assignedTo !== undefined) {
      ticket.assignedTo = assignedTo || null;
    }
    if (internalNote) {
      ticket.adminNotes = ticket.adminNotes || [];
      ticket.adminNotes.push({
        admin: adminId,
        note: internalNote,
        createdAt: new Date(),
      });
    }
    if (replyText) {
      ticket.messages.push({
        sender: adminId,
        senderRole: 'SUPPORT',
        text: replyText,
        createdAt: new Date(),
      });
    }

    await ticket.save();

    if (replyText) {
      eventBus.publish(APP_EVENT.TICKET_REPLIED, {
        ticketId: ticket._id.toString(),
        ticketNumber: ticket.ticketNumber,
        senderRole: 'SUPPORT',
      });
    }

    if (status === TICKET_STATE.RESOLVED || status === TICKET_STATE.CLOSED) {
      eventBus.publish(APP_EVENT.TICKET_CLOSED, {
        ticketId: ticket._id.toString(),
        ticketNumber: ticket.ticketNumber,
      });
    }

    await AuditLog.create({
      adminId,
      action: 'TICKET_UPDATED',
      targetType: 'TICKET',
      targetId: ticketId.toString(),
      reason: internalNote || replyText || `Status updated to ${status}`,
    });

    return ticket;
  }

  /**
   * Admin listing of physical cards with search and status filters.
   */
  async listCards({ page = 1, limit = 20, status, search } = {}) {
    const filter = {};
    if (status) {
      filter.$or = [{ state: status }, { status }];
    }

    if (search) {
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(safeSearch, 'i');

      const matchingUsers = await User.find({
        $or: [
          { username: searchRegex },
          { displayName: searchRegex },
          { email: searchRegex },
        ],
      })
        .select('_id')
        .lean();
      const userIds = matchingUsers.map((u) => u._id);

      const searchConditions = [
        { cardCode: searchRegex },
        { cardUid: searchRegex },
        { cardId: searchRegex },
      ];
      if (userIds.length > 0) {
        searchConditions.push({ assignedUser: { $in: userIds } });
        searchConditions.push({ userId: { $in: userIds } });
        searchConditions.push({ assignedTo: { $in: userIds } });
        searchConditions.push({ firstAssignedTo: { $in: userIds } });
      }

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }

    const numericPage = Math.max(1, parseInt(page, 10) || 1);
    const numericLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const total = await Card.countDocuments(filter);
    const cards = await Card.find(filter)
      .sort({ createdAt: -1 })
      .skip((numericPage - 1) * numericLimit)
      .limit(numericLimit)
      .populate('assignedUser', 'username displayName email')
      .populate('firstAssignedTo', 'username displayName email')
      .lean();

    const baseUrl = (process.env.APP_URL || 'https://onewinq.com').replace(/\/+$/, '');

    return {
      cards: cards.map((c) => {
        const cardId = c.cardId || c.cardCode || c.cardUid;
        return {
          id: c._id.toString(),
          cardId,
          cardCode: c.cardCode || c.cardUid,
          cardUid: c.cardUid || c.cardCode,
          url: c.url || `${baseUrl}/p/c/${cardId}`,
          edition: c.edition || (c.material ? c.material.toUpperCase() : 'PVC'),
          material: c.material || 'pvc',
          status: c.state || c.status,
          state: c.state || c.status,
          everAssigned: Boolean(c.everAssigned),
          currentOwner: c.assignedUser
            ? {
                id: c.assignedUser._id.toString(),
                username: c.assignedUser.username,
                displayName: c.assignedUser.displayName,
                email: c.assignedUser.email,
              }
            : null,
          firstOwner: c.firstAssignedTo
            ? {
                id: c.firstAssignedTo._id ? c.firstAssignedTo._id.toString() : c.firstAssignedTo.toString(),
                username: c.firstAssignedTo.username,
                displayName: c.firstAssignedTo.displayName,
                email: c.firstAssignedTo.email,
              }
            : null,
          assignedAt: c.assignedAt,
          tapCount: c.tapCount || 0,
          createdAt: c.createdAt,
        };
      }),
      stats: await this.getCardStats(),
      total,
      page: numericPage,
      limit: numericLimit,
    };
  }

  /**
   * Admin card inspection details.
   */
  async getCardDetails(cardIdentifier) {
    const identifier = (cardIdentifier || '').toUpperCase().trim();
    const card = await Card.findOne({
      $or: [{ cardCode: identifier }, { cardUid: identifier }, { cardId: identifier }],
    })
      .populate('assignedUser', 'username displayName email accountState')
      .populate('firstAssignedTo', 'username displayName email')
      .lean();

    if (!card) {
      throw new AppError('Card not found', ERROR_CODE.NOT_FOUND, HTTP.NOT_FOUND);
    }

    const auditLogs = await AuditLog.find({
      targetType: 'CARD',
      targetId: { $in: [card.cardCode, card.cardUid, card.cardId].filter(Boolean) },
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('adminId', 'username displayName')
      .lean();

    const baseUrl = (process.env.APP_URL || 'https://onewinq.com').replace(/\/+$/, '');
    const cardId = card.cardId || card.cardCode || card.cardUid;
    const url = card.url || `${baseUrl}/p/c/${cardId}`;

    return {
      card: {
        id: card._id.toString(),
        cardId,
        cardCode: card.cardCode || card.cardUid,
        cardUid: card.cardUid || card.cardCode,
        url,
        activationCode: card.metadata?.rawSecret || null,
        nfcUid: card.nfcUid || null,
        edition: card.edition || (card.material ? card.material.toUpperCase() : 'PVC'),
        material: card.material || 'pvc',
        status: card.state || card.status,
        state: card.state || card.status,
        everAssigned: Boolean(card.everAssigned),
        assignedAt: card.assignedAt,
        firstAssignedAt: card.firstAssignedAt,
        currentOwner: card.assignedUser
          ? {
              id: card.assignedUser._id.toString(),
              username: card.assignedUser.username,
              displayName: card.assignedUser.displayName,
              email: card.assignedUser.email,
            }
          : null,
        firstOwner: card.firstAssignedTo
          ? {
              id: card.firstAssignedTo._id ? card.firstAssignedTo._id.toString() : card.firstAssignedTo.toString(),
              username: card.firstAssignedTo.username,
              displayName: card.firstAssignedTo.displayName,
              email: card.firstAssignedTo.email,
            }
          : null,
        tapCount: card.tapCount || 0,
        qrScanCount: card.qrScanCount || 0,
        activatedAt: card.activatedAt,
        createdAt: card.createdAt,
      },
      auditLogs: auditLogs.map((log) => ({
        id: log._id.toString(),
        action: log.action,
        performedBy: log.adminId ? log.adminId.displayName || log.adminId.username : 'System',
        createdAt: log.createdAt,
        details: log.details,
      })),
    };
  }

  /**
   * Generates single or batch physical NFC cards with sequential Card IDs (e.g. OWQ-CARD-000001)
   * and unique URLs (https://onewinq.com/p/c/OWQ-CARD-000001).
   */
  async generateCards(adminId, { count = 1, material = 'pvc', notes = '' } = {}, meta = {}) {
    const numericCount = Math.min(5000, Math.max(1, parseInt(count, 10) || 1));
    const normalizedMaterial = (material || 'pvc').toLowerCase();
    const edition = normalizedMaterial.toUpperCase();

    const { startSeq, endSeq } = await getNextCardSequenceBlock(numericCount);
    const baseUrl = (process.env.APP_URL || 'https://onewinq.com').replace(/\/+$/, '');

    const cardDocs = [];
    const generatedList = [];

    for (let seq = startSeq; seq <= endSeq; seq++) {
      const paddedNumber = String(seq).padStart(6, '0');
      const cardCode = `OWQ-CARD-${paddedNumber}`;
      const url = `${baseUrl}/p/c/${cardCode}`;
      const rawSecret = crypto.randomBytes(6).toString('hex').toUpperCase();
      const secretHash = await hashPassword(rawSecret);

      cardDocs.push({
        cardCode,
        cardUid: cardCode,
        cardId: cardCode,
        url,
        edition,
        material: normalizedMaterial,
        secretHash,
        state: CARD_STATE.UNASSIGNED,
        status: CARD_STATE.UNASSIGNED,
        assignedUser: null,
        userId: null,
        transferCount: 0,
        hasBeenTransferred: false,
        metadata: notes ? { notes, rawSecret } : { rawSecret },
      });

      generatedList.push({
        cardId: cardCode,
        url,
        edition,
        status: CARD_STATE.UNASSIGNED,
        activationCode: rawSecret,
      });
    }

    try {
      await Card.insertMany(cardDocs, { ordered: false });
    } catch (err) {
      if (err.code === 11000 && (err.message?.includes('customSlug') || err.keyPattern?.customSlug)) {
        try {
          await Card.collection.dropIndex('customSlug_1').catch(() => {});
          await Card.collection.createIndex(
            { customSlug: 1 },
            { unique: true, partialFilterExpression: { customSlug: { $type: 'string' } } }
          ).catch(() => {});
          await Card.insertMany(cardDocs, { ordered: false });
        } catch {
          throw err;
        }
      } else {
        throw err;
      }
    }

    // Build CSV content: cardId,activationCode,url
    const csvRows = ['cardId,activationCode,url'];
    for (const item of generatedList) {
      csvRows.push(`${item.cardId},${item.activationCode},${item.url}`);
    }
    const csv = csvRows.join('\n');

    await AuditLog.create({
      adminId,
      action: 'CARDS_GENERATED',
      targetType: 'CARD_BATCH',
      targetId: `${generatedList[0].cardId}..${generatedList[generatedList.length - 1].cardId}`,
      ipAddress: meta.ip || '',
      userAgent: meta.userAgent || '',
      details: {
        count: numericCount,
        material: normalizedMaterial,
        startCardId: generatedList[0].cardId,
        endCardId: generatedList[generatedList.length - 1].cardId,
        notes,
      },
    });

    logger.info('Physical NFC cards generated', {
      adminId,
      count: numericCount,
      range: `${generatedList[0].cardId}..${generatedList[generatedList.length - 1].cardId}`,
    });

    return {
      count: numericCount,
      cards: generatedList,
      csv,
      stats: await this.getCardStats(),
    };
  }

  /**
   * Assign an unassigned card to an existing OneWinq user.
   * STRICT PERMANENT ASSIGNMENT LOCK: A card can be assigned to only ONE user once in its entire lifetime.
   */
  async assignCard(adminId, cardIdentifier, { userId }, meta = {}) {
    const identifier = (cardIdentifier || '').toUpperCase().trim();
    const card = await Card.findOne({
      $or: [{ cardCode: identifier }, { cardUid: identifier }, { cardId: identifier }],
    });

    if (!card) {
      throw new AppError('Card not found', ERROR_CODE.NOT_FOUND, HTTP.NOT_FOUND);
    }

    if (card.state === CARD_STATE.BLOCKED || card.status === CARD_STATE.BLOCKED) {
      throw new AppError(
        'Cannot assign a blocked card. Unblock the card first.',
        ERROR_CODE.FORBIDDEN,
        HTTP.FORBIDDEN
      );
    }

    // STRICT PERMANENT ASSIGNMENT LOCK:
    // If the card was ever assigned, it can NEVER be assigned to any other user!
    const targetUserIdStr = userId.toString();
    if (card.everAssigned && card.firstAssignedTo && card.firstAssignedTo.toString() !== targetUserIdStr) {
      throw new AppError(
        'This physical NFC card was permanently linked to its original owner and can never be assigned to another user.',
        ERROR_CODE.CONFLICT,
        HTTP.CONFLICT
      );
    }

    if (card.assignedUser && card.assignedUser.toString() !== targetUserIdStr) {
      throw new AppError(
        'Card is already assigned to another user.',
        ERROR_CODE.CONFLICT,
        HTTP.CONFLICT
      );
    }

    const targetUser = await User.findById(userId);
    if (!targetUser || targetUser.accountState !== ACCOUNT_STATE.ACTIVE) {
      throw new AppError('Active user not found', ERROR_CODE.NOT_FOUND, HTTP.NOT_FOUND);
    }

    // Atomic assignment check to protect against concurrent assignment race conditions
    let updatedCard;
    if (!card.everAssigned) {
      updatedCard = await Card.findOneAndUpdate(
        {
          _id: card._id,
          everAssigned: { $ne: true },
          assignedUser: null,
        },
        {
          $set: {
            assignedUser: targetUser._id,
            userId: targetUser._id,
            assignedTo: targetUser._id,
            firstAssignedTo: targetUser._id,
            firstAssignedAt: new Date(),
            everAssigned: true,
            state: CARD_STATE.ACTIVE,
            status: CARD_STATE.ACTIVE,
            assignedAt: new Date(),
            activatedAt: card.activatedAt || new Date(),
          },
        },
        { new: true }
      );

      if (!updatedCard) {
        throw new AppError(
          'Card assignment conflict: This card was just assigned by another request or is already locked.',
          ERROR_CODE.CONFLICT,
          HTTP.CONFLICT
        );
      }
    } else {
      // Card was previously assigned to this user and unassigned; re-activating active association for original owner
      updatedCard = await Card.findOneAndUpdate(
        {
          _id: card._id,
          firstAssignedTo: targetUser._id,
          $or: [{ assignedUser: null }, { assignedUser: targetUser._id }],
        },
        {
          $set: {
            assignedUser: targetUser._id,
            userId: targetUser._id,
            assignedTo: targetUser._id,
            state: CARD_STATE.ACTIVE,
            status: CARD_STATE.ACTIVE,
            assignedAt: new Date(),
          },
        },
        { new: true }
      );

      if (!updatedCard) {
        throw new AppError(
          'This physical NFC card was permanently linked to its original owner and can never be assigned to another user.',
          ERROR_CODE.CONFLICT,
          HTTP.CONFLICT
        );
      }
    }

    await AuditLog.create({
      adminId,
      action: 'CARD_ASSIGNED',
      targetType: 'CARD',
      targetId: updatedCard.cardCode || updatedCard.cardUid,
      ipAddress: meta.ip || '',
      userAgent: meta.userAgent || '',
      details: {
        assignedToUserId: targetUser._id.toString(),
        assignedToName: targetUser.displayName,
        assignedToEmail: targetUser.email,
        assignedToUsername: targetUser.username,
        everAssigned: true,
      },
    });

    logger.info('Card assigned by admin', {
      adminId,
      cardCode: updatedCard.cardCode,
      targetUserId: targetUser._id.toString(),
    });

    return this.getCardDetails(updatedCard.cardCode || updatedCard.cardUid);
  }

  /**
   * Unassign an active card back to UNASSIGNED without resetting the permanent ownership lock.
   */
  async unassignCard(adminId, cardIdentifier, meta = {}) {
    const identifier = (cardIdentifier || '').toUpperCase().trim();
    const card = await Card.findOne({
      $or: [{ cardCode: identifier }, { cardUid: identifier }, { cardId: identifier }],
    });

    if (!card) {
      throw new AppError('Card not found', ERROR_CODE.NOT_FOUND, HTTP.NOT_FOUND);
    }

    const previousUserId = card.assignedUser
      ? card.assignedUser.toString()
      : (card.firstAssignedTo ? card.firstAssignedTo.toString() : null);

    card.assignedUser = null;
    card.userId = null;
    card.assignedTo = null;
    card.state = CARD_STATE.UNASSIGNED;
    card.status = CARD_STATE.UNASSIGNED;
    card.assignedAt = null;
    // CRITICAL: everAssigned and firstAssignedTo remain intact and are never cleared!
    await card.save();

    await AuditLog.create({
      adminId,
      action: 'CARD_UNASSIGNED',
      targetType: 'CARD',
      targetId: card.cardCode || card.cardUid,
      ipAddress: meta.ip || '',
      userAgent: meta.userAgent || '',
      details: {
        previousUserId,
        firstAssignedTo: card.firstAssignedTo ? card.firstAssignedTo.toString() : null,
      },
    });

    logger.info('Card unassigned by admin', {
      adminId,
      cardCode: card.cardCode,
      previousUserId,
    });

    return this.getCardDetails(card.cardCode || card.cardUid);
  }

  /**
   * Activate, Deactivate, or Block a card. Preserves permanent ownership.
   */
  async updateCardState(adminId, cardIdentifier, { state, reason = '' } = {}, meta = {}) {
    const identifier = (cardIdentifier || '').toUpperCase().trim();
    const card = await Card.findOne({
      $or: [{ cardCode: identifier }, { cardUid: identifier }, { cardId: identifier }],
    });

    if (!card) {
      throw new AppError('Card not found', ERROR_CODE.NOT_FOUND, HTTP.NOT_FOUND);
    }

    const oldState = card.state;
    const newState = (state || '').toUpperCase().trim();

    if (newState === CARD_STATE.ACTIVE) {
      if (!card.assignedUser) {
        // If the card was previously assigned to an original owner, reactivate for them
        if (card.everAssigned && card.firstAssignedTo) {
          card.assignedUser = card.firstAssignedTo;
          card.userId = card.firstAssignedTo;
          card.assignedTo = card.firstAssignedTo;
          card.assignedAt = new Date();
        } else {
          throw new AppError(
            'Cannot activate an unassigned card. Please assign a user first.',
            ERROR_CODE.VALIDATION_ERROR,
            HTTP.BAD_REQUEST
          );
        }
      }
    }

    if (newState === CARD_STATE.UNASSIGNED) {
      card.assignedUser = null;
      card.userId = null;
      card.assignedTo = null;
      card.assignedAt = null;
      // everAssigned and firstAssignedTo remain intact
    }

    card.state = newState;
    card.status = newState;
    if (newState === CARD_STATE.ACTIVE && !card.activatedAt) {
      card.activatedAt = new Date();
    }
    await card.save();

    await AuditLog.create({
      adminId,
      action: 'CARD_STATUS_UPDATED',
      targetType: 'CARD',
      targetId: card.cardCode || card.cardUid,
      ipAddress: meta.ip || '',
      userAgent: meta.userAgent || '',
      details: {
        oldState,
        newState,
        reason,
        owner: card.firstAssignedTo ? card.firstAssignedTo.toString() : null,
      },
    });

    logger.info('Card state updated by admin', {
      adminId,
      cardCode: card.cardCode,
      oldState,
      newState,
    });

    return this.getCardDetails(card.cardCode || card.cardUid);
  }

  /**
   * List all hardware orders across the platform.
   */
  async listOrders({ status, q, limit = 50, page = 1 } = {}) {
    const filter = {};
    if (status && status !== 'ALL') {
      filter.state = status;
    }
    if (q && q.trim()) {
      const term = q.trim();
      const regex = new RegExp(term, 'i');
      filter.$or = [
        { orderNumber: regex },
        { 'shippingAddress.recipientName': regex },
        { 'shippingAddress.city': regex },
      ];
    }

    const skip = (page - 1) * limit;
    const [orders, total, totalStats] = await Promise.all([
      Order.find(filter)
        .populate('user', 'username displayName email avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
      Order.aggregate([
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            created: { $sum: { $cond: [{ $eq: ['$state', ORDER_STATE.CREATED] }, 1, 0] } },
            paid: { $sum: { $cond: [{ $eq: ['$state', ORDER_STATE.PAID] }, 1, 0] } },
            processing: { $sum: { $cond: [{ $eq: ['$state', ORDER_STATE.PROCESSING] }, 1, 0] } },
            shipped: { $sum: { $cond: [{ $eq: ['$state', ORDER_STATE.SHIPPED] }, 1, 0] } },
            delivered: { $sum: { $cond: [{ $eq: ['$state', ORDER_STATE.DELIVERED] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ['$state', ORDER_STATE.CANCELLED] }, 1, 0] } },
            totalRevenue: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      '$state',
                      [
                        ORDER_STATE.PAID,
                        ORDER_STATE.PROCESSING,
                        ORDER_STATE.SHIPPED,
                        ORDER_STATE.DELIVERED,
                      ],
                    ],
                  },
                  '$totalAmount',
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    const stats = totalStats[0] || {
      totalOrders: 0,
      created: 0,
      paid: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      totalRevenue: 0,
    };

    return {
      orders: orders.map((o) => ({
        id: o._id.toString(),
        _id: o._id.toString(),
        orderNumber: o.orderNumber,
        state: o.state,
        totalAmount: o.totalAmount,
        currency: o.currency,
        items: o.items,
        itemsCount: o.items?.reduce((s, it) => s + (it.quantity || 1), 0) || 1,
        shippingAddress: o.shippingAddress,
        carrier: o.carrier,
        trackingNumber: o.trackingNumber,
        assignedCardUids: o.assignedCardUids || [],
        user: o.user
          ? {
              id: o.user._id?.toString(),
              _id: o.user._id?.toString(),
              username: o.user.username,
              displayName: o.user.displayName,
              email: o.user.email,
              avatarUrl: o.user.avatarUrl,
            }
          : null,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      })),
      stats,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get single order by ID for admin.
   */
  async getOrder(orderId) {
    const order = await Order.findById(orderId)
      .populate('user', 'username displayName email avatarUrl')
      .lean();

    if (!order) {
      throw new AppError('Order not found', ERROR_CODE.NOT_FOUND, HTTP.NOT_FOUND);
    }

    let assignedCards = [];
    if (order.assignedCardUids && order.assignedCardUids.length > 0) {
      assignedCards = await Card.find({
        $or: [
          { cardCode: { $in: order.assignedCardUids } },
          { cardUid: { $in: order.assignedCardUids } },
        ],
      }).lean();
    }

    return {
      ...order,
      id: order._id.toString(),
      assignedCards,
    };
  }

  /**
   * Update order state, carrier, and tracking details.
   */
  async updateOrder(adminId, orderId, { state, carrier, trackingNumber }, meta = {}) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new AppError('Order not found', ERROR_CODE.NOT_FOUND, HTTP.NOT_FOUND);
    }

    const oldState = order.state;
    if (state) order.state = state;
    if (carrier !== undefined) order.carrier = carrier;
    if (trackingNumber !== undefined) order.trackingNumber = trackingNumber;

    await order.save();

    await AuditLog.create({
      adminId,
      action: 'ORDER_UPDATED',
      targetType: 'ORDER',
      targetId: order.orderNumber,
      ipAddress: meta.ip || '',
      userAgent: meta.userAgent || '',
      details: {
        oldState,
        newState: order.state,
        carrier: order.carrier,
        trackingNumber: order.trackingNumber,
      },
    });

    eventBus.publish(APP_EVENT.ORDER_STATUS_CHANGED, {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      userId: order.user.toString(),
      state: order.state,
      carrier: order.carrier,
      trackingNumber: order.trackingNumber,
    });

    return this.getOrder(order._id);
  }

  /**
   * Fulfill order by linking an NFC physical card and setting tracking.
   */
  async fulfillOrder(adminId, orderId, { cardCode, carrier, trackingNumber, state = ORDER_STATE.SHIPPED }, meta = {}) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new AppError('Order not found', ERROR_CODE.NOT_FOUND, HTTP.NOT_FOUND);
    }

    let targetCard;
    if (cardCode && cardCode.trim()) {
      const code = cardCode.trim().toUpperCase();
      targetCard = await Card.findOne({
        $or: [{ cardCode: code }, { cardUid: code }, { cardId: code }],
      });
      if (!targetCard) {
        throw new AppError(`Card ${code} not found`, ERROR_CODE.NOT_FOUND, HTTP.NOT_FOUND);
      }
    } else {
      // Auto-pick first available unassigned card
      targetCard = await Card.findOne({
        state: CARD_STATE.UNASSIGNED,
        assignedUser: null,
      });
      if (!targetCard) {
        throw new AppError(
          'No unassigned NFC cards available in inventory. Please generate cards first in Manage Cards.',
          ERROR_CODE.BAD_REQUEST,
          HTTP.BAD_REQUEST
        );
      }
    }

    // Assign the card permanently to the customer
    const assignedUserId = order.user.toString();
    await this.assignCard(adminId, targetCard.cardCode || targetCard.cardUid, { userId: assignedUserId }, meta);

    const actualCode = targetCard.cardCode || targetCard.cardUid;
    if (!order.assignedCardUids.includes(actualCode)) {
      order.assignedCardUids.push(actualCode);
    }

    order.state = state || ORDER_STATE.SHIPPED;
    if (carrier) order.carrier = carrier;
    order.trackingNumber = trackingNumber || ('TRK-' + Date.now().toString(36).toUpperCase());

    await order.save();

    await AuditLog.create({
      adminId,
      action: 'ORDER_FULFILLED',
      targetType: 'ORDER',
      targetId: order.orderNumber,
      ipAddress: meta.ip || '',
      userAgent: meta.userAgent || '',
      details: {
        cardCode: actualCode,
        assignedUser: assignedUserId,
        state: order.state,
        carrier: order.carrier,
        trackingNumber: order.trackingNumber,
      },
    });

    logger.info('Order fulfilled by admin', {
      adminId,
      orderNumber: order.orderNumber,
      cardCode: actualCode,
      user: assignedUserId,
    });

    eventBus.publish(APP_EVENT.ORDER_SHIPPED, {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      userId: assignedUserId,
      state: order.state,
      carrier: order.carrier,
      trackingNumber: order.trackingNumber,
      cardCode: actualCode,
    });

    eventBus.publish(APP_EVENT.CARD_ACTIVATED, {
      cardCode: actualCode,
      userId: assignedUserId,
      orderNumber: order.orderNumber,
      carrier: order.carrier,
      trackingNumber: order.trackingNumber,
    });

    return this.getOrder(order._id);
  }
}

export const adminService = new AdminService();

