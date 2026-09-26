import mongoose from 'mongoose';
import { Connection, getCanonicalUserPair } from './connection.model.js';
import { User } from '../users/user.model.js';
import { Profile } from '../profiles/profile.model.js';
import { ProfessionalIdentity } from '../profiles/professionalIdentity.model.js';
import { eventBus } from '../../events/eventBus.js';
import {
  NotFoundError,
  ConflictError,
  AuthorizationError,
  AppError,
} from '../../shared/errors.js';
import {
  ACCOUNT_STATE,
  CONNECTION_REQUEST_VISIBILITY,
  APP_EVENT,
  ERROR_CODE,
} from '../../config/constants.js';

/**
 * Retrieve all user IDs that are blocked by or blocking the given user.
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {Promise<Set<string>>}
 */
export async function getBlockedUserIds(userId) {
  if (!userId) {
    return new Set();
  }

  const uId = new mongoose.Types.ObjectId(String(userId));

  const blockedDocs = await Connection.find({
    $or: [{ userLow: uId }, { userHigh: uId }],
    state: 'BLOCKED',
  }).lean();

  const blockedSet = new Set();
  const userIdStr = String(userId);

  for (const doc of blockedDocs) {
    const lowStr = String(doc.userLow);
    const highStr = String(doc.userHigh);
    blockedSet.add(lowStr === userIdStr ? highStr : lowStr);
  }

  return blockedSet;
}

/**
 * Check if userA and userB have a mutual block relationship.
 */
export async function isBlockedMutual(userA, userB) {
  if (!userA || !userB || String(userA) === String(userB)) {
    return false;
  }

  const { userLow, userHigh } = getCanonicalUserPair(userA, userB);
  const rel = await Connection.findOne({ userLow, userHigh, state: 'BLOCKED' }).lean();
  return Boolean(rel);
}

/**
 * Retrieve the relative connection status between two users.
 */
export async function getConnectionStatus(viewerId, targetUserId) {
  if (!viewerId || !targetUserId) {
    return 'NONE';
  }
  if (String(viewerId) === String(targetUserId)) {
    return 'SELF';
  }

  const { userLow, userHigh } = getCanonicalUserPair(viewerId, targetUserId);
  const rel = await Connection.findOne({ userLow, userHigh });
  if (!rel) {
    return 'NONE';
  }

  return rel.getRelativeState(viewerId);
}

/**
 * Send a new connection request.
 */
export async function sendConnectionRequest({ fromUserId, toUserId, note = '' }) {
  if (String(fromUserId) === String(toUserId)) {
    throw new AppError('Cannot send a connection request to yourself', ERROR_CODE.VALIDATION_ERROR, 400);
  }

  const targetUser = await User.findById(toUserId).lean();
  if (!targetUser || targetUser.accountState !== ACCOUNT_STATE.ACTIVE) {
    throw new NotFoundError('User not found');
  }

  // Check target's connection request privacy setting
  if (targetUser.connectionRequestVisibility === CONNECTION_REQUEST_VISIBILITY.NOBODY) {
    throw new AuthorizationError('This user is not accepting connection requests');
  }

  const { userLow, userHigh } = getCanonicalUserPair(fromUserId, toUserId);

  let relationship = await Connection.findOne({ userLow, userHigh });

  if (relationship) {
    if (relationship.state === 'BLOCKED') {
      // Do not reveal block status
      throw new NotFoundError('User not found');
    }

    if (relationship.state === 'CONNECTED') {
      throw new ConflictError('You are already connected with this user');
    }

    if (relationship.state === 'PENDING') {
      const isSender = String(relationship.actionBy) === String(fromUserId);
      throw new ConflictError(
        isSender
          ? 'You have already sent a pending connection request'
          : 'This user has already sent you a connection request',
      );
    }
  }

  if (!relationship) {
    relationship = new Connection({
      userLow,
      userHigh,
      state: 'PENDING',
      actionBy: fromUserId,
      note,
    });
  } else {
    relationship.state = 'PENDING';
    relationship.actionBy = fromUserId;
    relationship.note = note;
  }

  await relationship.save();

  eventBus.publish(APP_EVENT.CONNECTION_REQUEST_SENT, {
    relationshipId: relationship._id.toString(),
    fromUserId: String(fromUserId),
    toUserId: String(toUserId),
    timestamp: new Date(),
  });

  return {
    id: relationship._id.toString(),
    status: 'PENDING_SENT',
    note: relationship.note,
  };
}

/**
 * Helper to find a relationship by either its Connection _id or the target user's _id.
 */
async function findRelationshipByIdOrUser(userId, requestIdOrUserId) {
  if (!requestIdOrUserId) return null;
  const idStr = String(requestIdOrUserId);
  if (!mongoose.Types.ObjectId.isValid(idStr)) return null;

  let rel = await Connection.findById(idStr);
  if (rel) return rel;

  try {
    const { userLow, userHigh } = getCanonicalUserPair(userId, idStr);
    rel = await Connection.findOne({ userLow, userHigh });
    return rel;
  } catch {
    return null;
  }
}

/**
 * Accept an incoming connection request.
 */
export async function acceptConnectionRequest({ userId, requestId }) {
  const relationship = await findRelationshipByIdOrUser(userId, requestId);
  if (!relationship || relationship.state !== 'PENDING') {
    throw new NotFoundError('Connection request not found or already processed');
  }

  // Verify the user is a participant and is NOT the one who sent the request
  const userStr = String(userId);
  const isParticipant =
    String(relationship.userLow) === userStr || String(relationship.userHigh) === userStr;

  if (!isParticipant) {
    throw new NotFoundError('Connection request not found');
  }

  if (String(relationship.actionBy) === userStr) {
    throw new AppError('Cannot accept your own connection request', ERROR_CODE.VALIDATION_ERROR, 400);
  }

  const requesterId = relationship.getOtherUserId(userId);

  relationship.state = 'CONNECTED';
  relationship.connectedAt = new Date();
  relationship.actionBy = userId;
  await relationship.save();

  eventBus.publish(APP_EVENT.CONNECTION_ACCEPTED, {
    relationshipId: relationship._id.toString(),
    acceptedBy: userStr,
    requesterId: String(requesterId),
    timestamp: new Date(),
  });

  return {
    id: relationship._id.toString(),
    status: 'CONNECTED',
    connectedAt: relationship.connectedAt,
  };
}

/**
 * Reject an incoming connection request.
 */
export async function rejectConnectionRequest({ userId, requestId }) {
  const relationship = await findRelationshipByIdOrUser(userId, requestId);
  if (!relationship || relationship.state !== 'PENDING') {
    throw new NotFoundError('Connection request not found or already processed');
  }

  const userStr = String(userId);
  const isParticipant =
    String(relationship.userLow) === userStr || String(relationship.userHigh) === userStr;

  if (!isParticipant || String(relationship.actionBy) === userStr) {
    throw new NotFoundError('Connection request not found');
  }

  const requesterId = relationship.getOtherUserId(userId);

  relationship.state = 'NONE';
  relationship.actionBy = userId;
  relationship.note = '';
  await relationship.save();

  eventBus.publish(APP_EVENT.CONNECTION_REJECTED, {
    relationshipId: relationship._id.toString(),
    rejectedBy: userStr,
    requesterId: String(requesterId),
    timestamp: new Date(),
  });

  return { message: 'Connection request rejected.' };
}

/**
 * Withdraw an outgoing connection request.
 */
export async function withdrawConnectionRequest({ userId, requestId }) {
  const relationship = await findRelationshipByIdOrUser(userId, requestId);
  if (!relationship || relationship.state !== 'PENDING') {
    throw new NotFoundError('Connection request not found or already processed');
  }

  const userStr = String(userId);
  if (String(relationship.actionBy) !== userStr) {
    throw new NotFoundError('Connection request not found');
  }

  relationship.state = 'NONE';
  relationship.note = '';
  await relationship.save();

  return { message: 'Connection request withdrawn.' };
}

/**
 * Remove an existing connection.
 */
export async function removeConnection({ userId, targetUserId }) {
  const { userLow, userHigh } = getCanonicalUserPair(userId, targetUserId);

  const relationship = await Connection.findOne({ userLow, userHigh, state: 'CONNECTED' });
  if (!relationship) {
    throw new NotFoundError('Connection not found');
  }

  relationship.state = 'NONE';
  relationship.connectedAt = null;
  relationship.actionBy = userId;
  await relationship.save();

  eventBus.publish(APP_EVENT.CONNECTION_REMOVED, {
    relationshipId: relationship._id.toString(),
    removedBy: String(userId),
    targetUserId: String(targetUserId),
    timestamp: new Date(),
  });

  return { message: 'Connection removed.' };
}

/**
 * Block a user (mutual visibility shielding).
 */
export async function blockUser({ userId, targetUserId }) {
  if (String(userId) === String(targetUserId)) {
    throw new AppError('Cannot block yourself', ERROR_CODE.VALIDATION_ERROR, 400);
  }

  const { userLow, userHigh } = getCanonicalUserPair(userId, targetUserId);

  let relationship = await Connection.findOne({ userLow, userHigh });

  if (!relationship) {
    relationship = new Connection({
      userLow,
      userHigh,
      state: 'BLOCKED',
      actionBy: userId,
      blockedAt: new Date(),
    });
  } else {
    relationship.state = 'BLOCKED';
    relationship.actionBy = userId;
    relationship.blockedAt = new Date();
    relationship.connectedAt = null;
    relationship.note = '';
  }

  await relationship.save();

  eventBus.publish(APP_EVENT.USER_BLOCKED, {
    blockedBy: String(userId),
    targetUserId: String(targetUserId),
    timestamp: new Date(),
  });

  return { message: 'User blocked successfully.' };
}

/**
 * Unblock a user (only permitted by the blocker).
 */
export async function unblockUser({ userId, targetUserId }) {
  const { userLow, userHigh } = getCanonicalUserPair(userId, targetUserId);

  const relationship = await Connection.findOne({
    userLow,
    userHigh,
    state: 'BLOCKED',
    actionBy: userId,
  });

  if (!relationship) {
    throw new NotFoundError('Blocked user not found');
  }

  relationship.state = 'NONE';
  relationship.blockedAt = null;
  await relationship.save();

  return { message: 'User unblocked successfully.' };
}

/**
 * Get active connections for a user with cursor pagination.
 */
export async function getConnections(userId, { cursor, limit = 20 }) {
  const uId = new mongoose.Types.ObjectId(String(userId));

  const filter = {
    $or: [{ userLow: uId }, { userHigh: uId }],
    state: 'CONNECTED',
  };

  if (cursor) {
    filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const relationships = await Connection.find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean();

  const hasNextPage = relationships.length > limit;
  const items = hasNextPage ? relationships.slice(0, limit) : relationships;
  const nextCursor = hasNextPage ? items[items.length - 1]._id.toString() : null;

  // Extract other user IDs
  const userIdStr = String(userId);
  const otherUserIds = items.map((r) =>
    String(r.userLow) === userIdStr ? r.userHigh : r.userLow,
  );

  const [users, profiles, identities] = await Promise.all([
    User.find({ _id: { $in: otherUserIds } }).select('displayName username accountState').lean(),
    Profile.find({ userId: { $in: otherUserIds } }).select('userId avatarUrl headline location').lean(),
    ProfessionalIdentity.find({ userId: { $in: otherUserIds }, isPrimary: true }).lean(),
  ]);

  const userMap = new Map(users.map((u) => [u._id.toString(), u]));
  const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));
  const identityMap = new Map(identities.map((i) => [i.userId.toString(), i]));

  const connections = items.map((r) => {
    const otherId = String(r.userLow) === userIdStr ? r.userHigh.toString() : r.userLow.toString();
    const u = userMap.get(otherId) || {};
    const p = profileMap.get(otherId) || {};
    const idn = identityMap.get(otherId) || {};

    return {
      id: r._id.toString(),
      _id: r._id.toString(),
      connectionId: r._id.toString(),
      connectedAt: r.connectedAt,
      user: {
        id: otherId,
        _id: otherId,
        username: u.username || 'User',
        displayName: u.displayName || u.username || 'User',
        avatarUrl: p.avatarUrl || null,
        headline: p.headline || '',
        primaryProfession: idn.customTitle || null,
      },
    };
  });

  return {
    connections,
    nextCursor,
    hasNextPage,
  };
}

/**
 * Get pending connection requests (incoming or outgoing) with cursor pagination.
 */
export async function getPendingRequests(userId, { direction = 'incoming', cursor, limit = 20 }) {
  const uId = new mongoose.Types.ObjectId(String(userId));

  const filter = {
    $or: [{ userLow: uId }, { userHigh: uId }],
    state: 'PENDING',
  };

  if (direction === 'incoming') {
    filter.actionBy = { $ne: uId };
  } else {
    filter.actionBy = uId;
  }

  if (cursor) {
    filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const items = await Connection.find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean();

  const hasNextPage = items.length > limit;
  const docs = hasNextPage ? items.slice(0, limit) : items;
  const nextCursor = hasNextPage ? docs[docs.length - 1]._id.toString() : null;

  const userIdStr = String(userId);
  const otherUserIds = docs.map((r) =>
    String(r.userLow) === userIdStr ? r.userHigh : r.userLow,
  );

  const [users, profiles, identities] = await Promise.all([
    User.find({ _id: { $in: otherUserIds } }).select('displayName username').lean(),
    Profile.find({ userId: { $in: otherUserIds } }).select('userId avatarUrl headline').lean(),
    ProfessionalIdentity.find({ userId: { $in: otherUserIds }, isPrimary: true }).lean(),
  ]);

  const userMap = new Map(users.map((u) => [u._id.toString(), u]));
  const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));
  const identityMap = new Map(identities.map((i) => [i.userId.toString(), i]));

  const requests = docs.map((r) => {
    const otherId = String(r.userLow) === userIdStr ? r.userHigh.toString() : r.userLow.toString();
    const u = userMap.get(otherId) || {};
    const p = profileMap.get(otherId) || {};
    const idn = identityMap.get(otherId) || {};

    const userSummary = {
      id: otherId,
      _id: otherId,
      username: u.username || 'User',
      displayName: u.displayName || u.username || 'User',
      avatarUrl: p.avatarUrl || null,
      headline: p.headline || '',
      primaryProfession: idn.customTitle || null,
    };

    return {
      id: r._id.toString(),
      _id: r._id.toString(),
      requestId: r._id.toString(),
      note: r.note,
      createdAt: r.createdAt,
      direction,
      requesterId: direction === 'incoming' ? userSummary : String(userId),
      recipientId: direction === 'outgoing' ? userSummary : String(userId),
      user: userSummary,
    };
  });

  return {
    requests,
    nextCursor,
    hasNextPage,
  };
}

/**
 * Get list of users blocked by the current user.
 */
export async function getBlockedUsers(userId, { cursor, limit = 20 }) {
  const uId = new mongoose.Types.ObjectId(String(userId));

  const filter = {
    actionBy: uId,
    state: 'BLOCKED',
  };

  if (cursor) {
    filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const items = await Connection.find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean();

  const hasNextPage = items.length > limit;
  const docs = hasNextPage ? items.slice(0, limit) : items;
  const nextCursor = hasNextPage ? docs[docs.length - 1]._id.toString() : null;

  const userIdStr = String(userId);
  const otherUserIds = docs.map((r) =>
    String(r.userLow) === userIdStr ? r.userHigh : r.userLow,
  );

  const users = await User.find({ _id: { $in: otherUserIds } })
    .select('displayName username')
    .lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const blockedList = docs.map((r) => {
    const otherId = String(r.userLow) === userIdStr ? r.userHigh.toString() : r.userLow.toString();
    const u = userMap.get(otherId) || {};

    return {
      blockId: r._id.toString(),
      blockedAt: r.blockedAt,
      user: {
        id: otherId,
        username: u.username,
        displayName: u.displayName,
      },
    };
  });

  return {
    blockedUsers: blockedList,
    nextCursor,
    hasNextPage,
  };
}

/**
 * Calculate mutual connections between userA and userB.
 */
export async function getMutualConnections(userA, userB) {
  if (String(userA) === String(userB)) {
    return [];
  }

  // Check if mutually blocked
  if (await isBlockedMutual(userA, userB)) {
    return [];
  }

  const [relsA, relsB] = await Promise.all([
    Connection.find({
      $or: [{ userLow: userA }, { userHigh: userA }],
      state: 'CONNECTED',
    }).lean(),
    Connection.find({
      $or: [{ userLow: userB }, { userHigh: userB }],
      state: 'CONNECTED',
    }).lean(),
  ]);

  const strA = String(userA);
  const strB = String(userB);

  const setA = new Set(
    relsA.map((r) => (String(r.userLow) === strA ? String(r.userHigh) : String(r.userLow))),
  );

  const mutualIds = [];
  for (const r of relsB) {
    const other = String(r.userLow) === strB ? String(r.userHigh) : String(r.userLow);
    if (setA.has(other)) {
      mutualIds.push(new mongoose.Types.ObjectId(other));
    }
  }

  if (mutualIds.length === 0) {
    return [];
  }

  // Filter out any mutuals that are blocked by either userA or userB
  const [blockedA, blockedB] = await Promise.all([
    getBlockedUserIds(userA),
    getBlockedUserIds(userB),
  ]);

  const cleanMutualIds = mutualIds.filter(
    (id) => !blockedA.has(String(id)) && !blockedB.has(String(id)),
  );

  const users = await User.find({
    _id: { $in: cleanMutualIds },
    accountState: ACCOUNT_STATE.ACTIVE,
  })
    .select('displayName username')
    .lean();

  return users.map((u) => ({
    id: u._id.toString(),
    displayName: u.displayName,
    username: u.username,
  }));
}
