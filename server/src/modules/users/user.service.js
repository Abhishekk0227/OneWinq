import { User } from './user.model.js';
import { NotFoundError, AppError } from '../../shared/errors.js';
import { ERROR_CODE, ACCOUNT_STATE } from '../../config/constants.js';
import { hasActiveCard, filterToCardActive } from '../cards/cardGate.js';

export const userService = {
  /**
   * Get current authenticated user details.
   */
  async getMe(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user.toSafeObject();
  },

  /**
   * Get public details of a user by ID.
   * Card-gate: returns 404 if the user has no active physical card.
   * Anti-enumeration: response is identical to a non-existent user.
   */
  async getUserById(userId) {
    const user = await User.findOne({
      _id: userId,
      accountState: { $in: [ACCOUNT_STATE.ACTIVE] },
    });
    if (!user) {
      throw new NotFoundError('User not found');
    }
    // Card-first identity: the user does not publicly exist until card is active
    const cardActive = await hasActiveCard(userId);
    if (!cardActive) {
      throw new NotFoundError('User not found');
    }
    return user.toSafeObject();
  },

  /**
   * Update user privacy and discovery preferences.
   */
  async updatePrivacySettings(userId, { appearInDiscovery, connectionRequestVisibility }) {
    const update = {};
    if (typeof appearInDiscovery === 'boolean') {
      update.appearInDiscovery = appearInDiscovery;
    }
    if (connectionRequestVisibility) {
      update.connectionRequestVisibility = connectionRequestVisibility;
    }

    const user = await User.findByIdAndUpdate(userId, { $set: update }, { new: true });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user.toSafeObject();
  },

  /**
   * Update basic profile details of current user (displayName, avatarUrl).
   */
  async updateMe(userId, { displayName, avatarUrl }) {
    const update = {};
    if (displayName && typeof displayName === 'string' && displayName.trim()) {
      update.displayName = displayName.trim();
    }
    if (avatarUrl !== undefined) {
      update.avatarUrl = avatarUrl || null;
    }

    const user = await User.findByIdAndUpdate(userId, { $set: update }, { new: true });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user.toSafeObject();
  },

  /**
   * List users with pagination and search (for discovery and directory).
   * Card-gate: only users with an active physical card are visible.
   */
  async listUsers({ query, limit = 20, cursor = null }) {
    const filter = {
      accountState: ACCOUNT_STATE.ACTIVE,
      appearInDiscovery: true,
    };

    if (query) {
      const sanitized = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { displayName: { $regex: sanitized, $options: 'i' } },
        { username: { $regex: sanitized, $options: 'i' } },
      ];
    }

    if (cursor) {
      filter.createdAt = { $lt: new Date(cursor) };
    }

    const pageSize = Math.min(Number(limit) || 20, 50);
    // Over-fetch to compensate for card-gate filtering
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .limit(pageSize * 3);

    // Card-gate: only expose users who have an active physical card
    const activeSet = await filterToCardActive(users.map((u) => u._id));
    const gated = users.filter((u) => activeSet.has(u._id.toString()));

    const hasMore = gated.length > pageSize;
    const results = hasMore ? gated.slice(0, pageSize) : gated;
    const nextCursor = hasMore ? results[results.length - 1].createdAt.toISOString() : null;

    return {
      users: results.map((u) => u.toSafeObject()),
      pagination: {
        hasMore,
        nextCursor,
      },
    };
  },
};
