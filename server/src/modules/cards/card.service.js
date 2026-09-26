import { Card } from './card.model.js';
import { User } from '../users/user.model.js';
import {
  CARD_STATE,
  APP_EVENT,
  ERROR_CODE,
} from '../../config/constants.js';
import {
  NotFoundError,
  AppError,
  ConflictError,
  ValidationError,
  ForbiddenError,
} from '../../shared/errors.js';
import { verifyPassword } from '../auth/passwordService.js';
import { eventBus } from '../../events/eventBus.js';
import logger from '../../utils/logger.js';

export const cardService = {
  /**
   * Claim and activate a new physical card.
   * STRICT PERMANENT OWNERSHIP LOCK: Once assigned, it can never belong to another user.
   */
  async activateCard({ userId, cardCode, cardUid, activationCode, nickname }) {
    const identifier = (cardCode || cardUid || '').toUpperCase().trim();
    const card = await Card.findOne({
      $or: [{ cardCode: identifier }, { cardUid: identifier }],
    }).select('+secretHash');

    if (!card) {
      throw new NotFoundError('Card not found with the provided code');
    }

    // STRICT PERMANENT ASSIGNMENT LOCK:
    if (card.everAssigned && card.firstAssignedTo && card.firstAssignedTo.toString() !== userId.toString()) {
      throw new ConflictError(
        'This physical NFC card was permanently linked to its original owner and can never be assigned to another user.'
      );
    }

    if (card.assignedUser && card.assignedUser.toString() !== userId.toString()) {
      throw new ConflictError('Card is already assigned to another account');
    }

    if (card.state === CARD_STATE.ACTIVE && card.assignedUser?.toString() === userId.toString()) {
      throw new AppError('Card is already active on your account', ERROR_CODE.CONFLICT, 409);
    }

    // Verify activation code against secretHash
    const isValid = await verifyPassword(activationCode, card.secretHash);
    if (!isValid) {
      throw new AppError('Invalid activation code for this card', ERROR_CODE.VALIDATION_ERROR, 400);
    }

    card.assignedUser = userId;
    card.userId = userId;
    card.assignedTo = userId;
    card.everAssigned = true;
    if (!card.firstAssignedTo) {
      card.firstAssignedTo = userId;
      card.firstAssignedAt = new Date();
    }
    card.state = CARD_STATE.ACTIVE;
    card.status = CARD_STATE.ACTIVE;
    card.assignedAt = new Date();
    card.activatedAt = new Date();
    if (nickname) {
      card.nickname = nickname.trim();
    }
    await card.save();

    eventBus.publish(APP_EVENT.CARD_ACTIVATED, {
      cardCode: card.cardCode || card.cardUid,
      cardUid: card.cardUid,
      userId: userId.toString(),
      timestamp: new Date(),
    });

    return {
      cardCode: card.cardCode || card.cardUid,
      cardUid: card.cardUid,
      edition: card.edition || (card.material ? card.material.toUpperCase() : 'PVC'),
      material: card.material,
      state: card.state,
      status: card.state,
      customSlug: card.customSlug,
      assignedUser: userId.toString(),
      userId: userId.toString(),
      everAssigned: true,
      firstAssignedTo: (card.firstAssignedTo || userId).toString(),
      nickname: card.nickname,
      activatedAt: card.activatedAt,
    };
  },

  /**
   * Resolve a public NFC card tap.
   * Works identically before and after transfer, preserving tap analytics.
   */
  async resolveTap(cardIdentifier, { ip = null, userAgent = null } = {}) {
    const identifier = (cardIdentifier || '').toUpperCase().trim();
    const card = await Card.findOne({
      $or: [{ cardCode: identifier }, { cardUid: identifier }, { cardId: identifier }],
    });

    if (!card) {
      throw new NotFoundError('Card not found');
    }

    if (card.state === CARD_STATE.BLOCKED || card.status === CARD_STATE.BLOCKED) {
      throw new AppError(
        'This card has been blocked.',
        ERROR_CODE.FORBIDDEN,
        403,
      );
    }

    if (card.state === CARD_STATE.LOST || card.status === CARD_STATE.LOST) {
      throw new AppError('This card has been reported lost.', ERROR_CODE.FORBIDDEN, 403);
    }

    if (card.state === CARD_STATE.INACTIVE || card.status === CARD_STATE.INACTIVE) {
      throw new AppError(
        'This card has been temporarily deactivated.',
        ERROR_CODE.FORBIDDEN,
        403,
      );
    }

    if (
      card.state === CARD_STATE.UNASSIGNED ||
      card.status === CARD_STATE.UNASSIGNED ||
      !card.assignedUser
    ) {
      throw new AppError('This card is not assigned to any user yet.', ERROR_CODE.NOT_FOUND, 404);
    }

    if (card.state !== CARD_STATE.ACTIVE) {
      throw new AppError('This card is not active yet.', ERROR_CODE.FORBIDDEN, 403);
    }

    // Increment tap metrics (cumulative across card lifetime)
    card.tapCount += 1;
    card.lastTappedAt = new Date();
    await card.save();

    const user = await User.findById(card.assignedUser).select('username displayName accountState').lean();
    if (!user || user.accountState !== 'ACTIVE') {
      throw new NotFoundError('The profile linked to this card is unavailable');
    }

    eventBus.publish(APP_EVENT.CARD_TAPPED, {
      cardCode: card.cardCode || card.cardUid,
      cardUid: card.cardUid,
      userId: card.assignedUser.toString(),
      ip,
      userAgent,
      timestamp: new Date(),
    });

    return {
      cardCode: card.cardCode || card.cardUid,
      cardUid: card.cardUid,
      cardId: card.cardId || card.cardCode || card.cardUid,
      url: card.url,
      username: user.username,
      displayName: user.displayName,
      redirectUrl: `/u/${user.username}`,
      customSlug: card.customSlug,
      tapCount: card.tapCount,
    };
  },

  /**
   * Resolve a public QR code scan.
   */
  async resolveScan(cardIdentifier, { ip = null, userAgent = null } = {}) {
    const identifier = (cardIdentifier || '').toUpperCase().trim();
    const card = await Card.findOne({
      $or: [{ cardCode: identifier }, { cardUid: identifier }, { cardId: identifier }],
    });

    if (!card) {
      throw new NotFoundError('Card not found');
    }

    if (card.state === CARD_STATE.BLOCKED || card.status === CARD_STATE.BLOCKED) {
      throw new AppError(
        'This card has been blocked.',
        ERROR_CODE.FORBIDDEN,
        403,
      );
    }

    if (card.state === CARD_STATE.LOST || card.status === CARD_STATE.LOST) {
      throw new AppError('This card has been reported lost.', ERROR_CODE.FORBIDDEN, 403);
    }

    if (card.state === CARD_STATE.INACTIVE || card.status === CARD_STATE.INACTIVE) {
      throw new AppError(
        'This card has been temporarily deactivated.',
        ERROR_CODE.FORBIDDEN,
        403,
      );
    }

    if (
      card.state === CARD_STATE.UNASSIGNED ||
      card.status === CARD_STATE.UNASSIGNED ||
      !card.assignedUser
    ) {
      throw new AppError('This card is not assigned to any user yet.', ERROR_CODE.NOT_FOUND, 404);
    }

    if (card.state !== CARD_STATE.ACTIVE) {
      throw new AppError('This card is not active yet.', ERROR_CODE.FORBIDDEN, 403);
    }

    // Increment scan metrics (cumulative across card lifetime)
    card.qrScanCount += 1;
    card.lastScannedAt = new Date();
    await card.save();

    const user = await User.findById(card.assignedUser).select('username displayName accountState').lean();
    if (!user || user.accountState !== 'ACTIVE') {
      throw new NotFoundError('The profile linked to this card is unavailable');
    }

    eventBus.publish(APP_EVENT.QR_SCANNED, {
      cardCode: card.cardCode || card.cardUid,
      cardUid: card.cardUid,
      userId: card.assignedUser.toString(),
      ip,
      userAgent,
      timestamp: new Date(),
    });

    return {
      cardCode: card.cardCode || card.cardUid,
      cardUid: card.cardUid,
      username: user.username,
      displayName: user.displayName,
      redirectUrl: `/u/${user.username}`,
      customSlug: card.customSlug,
      qrScanCount: card.qrScanCount,
    };
  },

  /**
   * List all cards owned by the user.
   */
  async listUserCards(userId) {
    const cards = await Card.find({
      $or: [{ assignedUser: userId }, { userId }],
    })
      .sort({ createdAt: -1 })
      .populate('assignedIdentity', 'customTitle isPrimary')
      .lean();

    return cards.map((c) => ({
      id: c._id.toString(),
      cardCode: c.cardCode || c.cardUid,
      cardUid: c.cardUid || c.cardCode,
      nfcUid: c.nfcUid || null,
      edition: c.edition || (c.material ? c.material.toUpperCase() : 'PVC'),
      material: c.material || 'pvc',
      state: c.state || c.status,
      status: c.status || c.state,
      nickname: c.nickname || null,
      customSlug: c.customSlug,
      tapCount: c.tapCount || 0,
      qrScanCount: c.qrScanCount || 0,
      lastTappedAt: c.lastTappedAt,
      lastScannedAt: c.lastScannedAt,
      activatedAt: c.activatedAt,
      everAssigned: Boolean(c.everAssigned),
      assignedIdentity: c.assignedIdentity
        ? {
            id: c.assignedIdentity._id.toString(),
            title: c.assignedIdentity.customTitle,
            isPrimary: c.assignedIdentity.isPrimary,
          }
        : null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  },

  /**
   * Get single card details for owner.
   */
  async getCardDetails(userId, cardIdentifier) {
    const identifier = (cardIdentifier || '').toUpperCase().trim();
    const card = await Card.findOne({
      $or: [{ cardCode: identifier }, { cardUid: identifier }],
      $and: [
        {
          $or: [{ assignedUser: userId }, { userId }],
        },
      ],
    })
      .populate('assignedIdentity', 'customTitle isPrimary')
      .lean();

    if (!card) {
      throw new NotFoundError('Card not found or does not belong to your account');
    }

    return {
      id: card._id.toString(),
      cardCode: card.cardCode || card.cardUid,
      cardUid: card.cardUid || card.cardCode,
      nfcUid: card.nfcUid || null,
      edition: card.edition || (card.material ? card.material.toUpperCase() : 'PVC'),
      material: card.material || 'pvc',
      state: card.state || card.status,
      status: card.status || card.state,
      nickname: card.nickname || null,
      customSlug: card.customSlug,
      tapCount: card.tapCount || 0,
      qrScanCount: card.qrScanCount || 0,
      lastTappedAt: card.lastTappedAt,
      lastScannedAt: card.lastScannedAt,
      activatedAt: card.activatedAt,
      everAssigned: Boolean(card.everAssigned),
      assignedIdentity: card.assignedIdentity
        ? {
            id: card.assignedIdentity._id.toString(),
            title: card.assignedIdentity.customTitle,
            isPrimary: card.assignedIdentity.isPrimary,
          }
        : null,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    };
  },

  /**
   * Update card linking, nickname, or custom vanity slug.
   */
  async updateCardSettings(userId, cardIdentifier, { assignedIdentityId, customSlug, nickname }) {
    const identifier = (cardIdentifier || '').toUpperCase().trim();
    const card = await Card.findOne({
      $or: [{ cardCode: identifier }, { cardUid: identifier }],
      $and: [
        {
          $or: [{ assignedUser: userId }, { userId }],
        },
      ],
    });

    if (!card) {
      throw new NotFoundError('Card not found');
    }

    if (customSlug && customSlug !== card.customSlug) {
      const existing = await Card.findOne({ customSlug, _id: { $ne: card._id } });
      if (existing) {
        throw new ConflictError('This custom slug is already claimed by another card');
      }
      card.customSlug = customSlug;
    } else if (customSlug === null) {
      card.customSlug = null;
    }

    if (assignedIdentityId !== undefined) {
      card.assignedIdentity = assignedIdentityId || null;
    }

    if (nickname !== undefined) {
      card.nickname = nickname ? nickname.trim() : null;
    }

    await card.save();

    return {
      cardCode: card.cardCode || card.cardUid,
      cardUid: card.cardUid,
      customSlug: card.customSlug,
      nickname: card.nickname,
      assignedIdentityId: card.assignedIdentity ? card.assignedIdentity.toString() : null,
      state: card.state,
      status: card.state,
    };
  },

  /**
   * Update card state (e.g. lock/freeze or report lost).
   * Note: Changing state (e.g., ACTIVE <-> BLOCKED) never restores or modifies hasBeenTransferred.
   */
  async updateCardState(userId, cardIdentifier, newState) {
    const identifier = (cardIdentifier || '').toUpperCase().trim();
    const card = await Card.findOne({
      $or: [{ cardCode: identifier }, { cardUid: identifier }],
      $and: [
        {
          $or: [{ assignedUser: userId }, { userId }],
        },
      ],
    });

    if (!card) {
      throw new NotFoundError('Card not found');
    }

    card.state = newState;
    card.status = newState;
    await card.save();

    return {
      cardCode: card.cardCode || card.cardUid,
      cardUid: card.cardUid,
      state: card.state,
      status: card.state,
      everAssigned: Boolean(card.everAssigned),
    };
  },
};
