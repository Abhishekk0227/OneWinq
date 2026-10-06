import mongoose from 'mongoose';
import { Conversation, getCanonicalConversationPair } from './conversation.model.js';
import { Message } from './message.model.js';
import { User } from '../users/user.model.js';
import { Profile } from '../profiles/profile.model.js';
import { ProfessionalIdentity } from '../profiles/professionalIdentity.model.js';
import { getConnectionStatus, isBlockedMutual } from '../connections/connection.service.js';
import { socketEmitter } from '../../infrastructure/sockets/socketEmitter.js';
import { eventBus } from '../../events/eventBus.js';
import {
  NotFoundError,
  AuthorizationError,
  AppError,
} from '../../shared/errors.js';
import { APP_EVENT, ERROR_CODE } from '../../config/constants.js';

/**
 * Get or create a 1-to-1 conversation between two users.
 * Enforces rule: only connected users can message.
 */
export async function getOrCreateConversation(userA, userB) {
  if (String(userA) === String(userB)) {
    throw new AppError('Cannot start a conversation with yourself', ERROR_CODE.VALIDATION_ERROR, 400);
  }

  // Verify active connection
  const status = await getConnectionStatus(userA, userB);
  if (status !== 'CONNECTED') {
    throw new AuthorizationError('You can only message users you are actively connected with');
  }

  // Check blocking
  if (await isBlockedMutual(userA, userB)) {
    throw new AuthorizationError('You cannot message this user');
  }

  const { userLow, userHigh } = getCanonicalConversationPair(userA, userB);

  let conversation = await Conversation.findOne({ userLow, userHigh });

  if (!conversation) {
    conversation = await Conversation.create({
      userLow,
      userHigh,
      lastMessageAt: new Date(),
    });
  } else {
    // If conversation was hidden/deleted by userA, restore it to their view
    const userAStr = String(userA);
    if (conversation.deletedBy.some((id) => String(id) === userAStr)) {
      conversation.deletedBy = conversation.deletedBy.filter((id) => String(id) !== userAStr);
      await conversation.save();
    }
  }

  return conversation;
}

/**
 * Retrieve conversations for a user's inbox with cursor pagination.
 */
export async function getUserConversations(userId, { cursor, limit = 20 }) {
  const uId = new mongoose.Types.ObjectId(String(userId));

  const filter = {
    $or: [
      { isGroup: true, members: uId },
      { isGroup: { $ne: true }, userLow: uId },
      { isGroup: { $ne: true }, userHigh: uId },
    ],
    deletedBy: { $ne: uId },
  };

  if (cursor) {
    filter.lastMessageAt = { $lt: new Date(cursor) };
  }

  const conversations = await Conversation.find(filter)
    .sort({ lastMessageAt: -1 })
    .limit(limit + 1)
    .lean();

  const hasNextPage = conversations.length > limit;
  const items = hasNextPage ? conversations.slice(0, limit) : conversations;
  const nextCursor =
    hasNextPage && items.length > 0 ? items[items.length - 1].lastMessageAt.toISOString() : null;

  const userIdStr = String(userId);
  const otherUserIds = items
    .filter((c) => !c.isGroup)
    .map((c) => (String(c.userLow) === userIdStr ? c.userHigh : c.userLow));

  const [users, profiles, identities] = await Promise.all([
    User.find({ _id: { $in: otherUserIds } }).select('displayName username accountState').lean(),
    Profile.find({ userId: { $in: otherUserIds } })
      .sort({ isActive: -1, updatedAt: -1 })
      .select('userId avatarUrl headline professionTitle location publishedData isActive')
      .lean(),
    ProfessionalIdentity.find({ userId: { $in: otherUserIds }, isPrimary: true }).lean(),
  ]);

  const userMap = new Map(users.map((u) => [u._id.toString(), u]));
  const profileMap = new Map();
  for (const p of profiles) {
    const uStr = p.userId.toString();
    if (!profileMap.has(uStr) || (!profileMap.get(uStr).isActive && p.isActive)) {
      profileMap.set(uStr, p);
    }
  }
  const identityMap = new Map(identities.map((i) => [i.userId.toString(), i]));

  const results = items.map((c) => {
    const unreadMap = c.unreadCounts instanceof Map
      ? Object.fromEntries(c.unreadCounts)
      : c.unreadCounts || {};
    const unreadCount = unreadMap[userIdStr] || 0;

    if (c.isGroup) {
      const participantObj = {
        _id: c._id.toString(),
        id: c._id.toString(),
        username: 'group',
        displayName: c.title || 'Group Chat',
        avatarUrl: c.avatarUrl || null,
        headline: `${(c.members || []).length} members`,
        isGroup: true,
      };

      return {
        _id: c._id.toString(),
        id: c._id.toString(),
        isGroup: true,
        title: c.title,
        description: c.description || '',
        creatorId: c.creatorId ? c.creatorId.toString() : null,
        memberCount: (c.members || []).length,
        admins: (c.admins || []).map((id) => id.toString()),
        members: (c.members || []).map((id) => id.toString()),
        lastMessage: c.lastMessage || null,
        lastMessageAt: c.lastMessageAt,
        unreadCount,
        participant: participantObj,
        otherUser: participantObj,
      };
    }

    const otherId = String(c.userLow) === userIdStr ? c.userHigh.toString() : c.userLow.toString();
    const u = userMap.get(otherId) || {};
    const p = profileMap.get(otherId) || {};
    const idn = identityMap.get(otherId) || {};

    const participantObj = {
      _id: otherId,
      id: otherId,
      username: u.username || 'User',
      displayName: u.displayName || u.username || 'User',
      avatarUrl: p.avatarUrl || null,
      headline: p.headline || '',
      primaryProfession: idn.customTitle || null,
      isGroup: false,
    };

    return {
      _id: c._id.toString(),
      id: c._id.toString(),
      isGroup: false,
      lastMessage: c.lastMessage || null,
      lastMessageAt: c.lastMessageAt,
      unreadCount,
      participant: participantObj,
      otherUser: participantObj,
    };
  });

  return {
    conversations: results,
    nextCursor,
    hasNextPage,
  };
}

/**
 * Send a message within a conversation.
 */
export async function sendMessage({ senderId, conversationId, text = '', type = 'text', attachments = [] }) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new NotFoundError('Conversation not found');
  }

  const senderStr = String(senderId);
  if (!conversation.isMember(senderId)) {
    throw new AuthorizationError('You are not a member of this conversation');
  }

  let recipientId = null;

  if (!conversation.isGroup) {
    recipientId = conversation.getOtherUserId(senderId);

    // Re-verify connection and block status for 1-to-1
    const status = await getConnectionStatus(senderId, recipientId);
    if (status !== 'CONNECTED' || (await isBlockedMutual(senderId, recipientId))) {
      throw new AuthorizationError('You cannot message this user');
    }
  }

  // Create message
  const message = await Message.create({
    conversationId: conversation._id,
    senderId,
    recipientId,
    type,
    text,
    attachments,
  });

  // Fetch sender info for real-time broadcast
  const [senderUser, senderProfile] = await Promise.all([
    User.findById(senderId).select('displayName username').lean(),
    Profile.findOne({ userId: senderId }).select('avatarUrl').lean(),
  ]);

  const senderObj = {
    id: senderStr,
    _id: senderStr,
    displayName: senderUser?.displayName || senderUser?.username || 'User',
    username: senderUser?.username || 'user',
    avatarUrl: senderProfile?.avatarUrl || null,
  };

  // Update conversation
  const now = new Date();
  conversation.lastMessage = {
    text: type === 'text' ? text : `[${type}]`,
    senderId,
    messageType: type,
    createdAt: now,
  };
  conversation.lastMessageAt = now;

  const formatted = message.toClientObject(senderId, senderObj);

  if (conversation.isGroup) {
    // Increment unread count for all other members
    for (const mId of conversation.members || []) {
      const mStr = String(mId);
      if (mStr !== senderStr) {
        const currentUnread = conversation.unreadCounts.get(mStr) || 0;
        conversation.unreadCounts.set(mStr, currentUnread + 1);
        socketEmitter.emitToUser(mStr, 'new_message_notification', {
          conversationId: conversationId.toString(),
          message: formatted,
        });
      }
    }
  } else if (recipientId) {
    const recipientStr = String(recipientId);
    const currentUnread = conversation.unreadCounts.get(recipientStr) || 0;
    conversation.unreadCounts.set(recipientStr, currentUnread + 1);
    socketEmitter.emitToUser(recipientStr, 'new_message_notification', {
      conversationId: conversationId.toString(),
      message: formatted,
    });
  }

  // Clear deletedBy if conversation was hidden
  conversation.deletedBy = [];

  await conversation.save();

  // Emit real-time events via Socket.IO
  socketEmitter.emitToConversation(conversationId, 'new_message', { message: formatted });

  // Internal event dispatch
  eventBus.publish(APP_EVENT.MESSAGE_SENT, {
    messageId: message._id.toString(),
    conversationId: conversationId.toString(),
    senderId: senderStr,
    recipientId: recipientId ? recipientId.toString() : null,
    timestamp: now,
  });

  return formatted;
}

/**
 * Get message history for a conversation with cursor pagination.
 */
export async function getMessages(userId, conversationId, { cursor, limit = 20 }) {
  const conversation = await Conversation.findById(conversationId).lean();
  if (!conversation) {
    throw new NotFoundError('Conversation not found');
  }

  const uIdStr = String(userId);
  const isMember = conversation.isGroup
    ? (conversation.members || []).some((id) => String(id) === uIdStr)
    : String(conversation.userLow) === uIdStr || String(conversation.userHigh) === uIdStr;

  if (!isMember) {
    throw new AuthorizationError('You are not a member of this conversation');
  }

  const filter = {
    conversationId: new mongoose.Types.ObjectId(String(conversationId)),
    deletedByUsers: { $ne: new mongoose.Types.ObjectId(String(userId)) },
  };

  if (cursor) {
    filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const items = await Message.find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1);

  const hasNextPage = items.length > limit;
  const docs = hasNextPage ? items.slice(0, limit) : items;
  const nextCursor = hasNextPage ? docs[docs.length - 1]._id.toString() : null;

  // Extract senders and attach sender details
  const senderIds = [...new Set(docs.map((m) => String(m.senderId)))];
  const [users, profiles] = await Promise.all([
    User.find({ _id: { $in: senderIds } }).select('displayName username').lean(),
    Profile.find({ userId: { $in: senderIds } }).select('userId avatarUrl').lean(),
  ]);
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));
  const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));

  const messages = docs.map((m) => {
    const sId = String(m.senderId);
    const u = userMap.get(sId);
    const p = profileMap.get(sId);
    const senderObj = {
      id: sId,
      _id: sId,
      displayName: u?.displayName || u?.username || 'User',
      username: u?.username || 'user',
      avatarUrl: p?.avatarUrl || null,
    };
    return m.toClientObject(userId, senderObj);
  });

  return {
    messages,
    nextCursor,
    hasNextPage,
  };
}

/**
 * Edit a sent text message.
 */
export async function editMessage({ userId, messageId, newText }) {
  const message = await Message.findById(messageId);
  if (!message) {
    throw new NotFoundError('Message not found');
  }

  if (String(message.senderId) !== String(userId)) {
    throw new AuthorizationError('You can only edit your own messages');
  }

  if (message.isDeletedForEveryone) {
    throw new AppError('Cannot edit a deleted message', ERROR_CODE.VALIDATION_ERROR, 400);
  }

  message.text = newText;
  message.isEdited = true;
  message.editedAt = new Date();
  await message.save();

  // If this was the last message, update conversation preview
  await Conversation.updateOne(
    { _id: message.conversationId, 'lastMessage.senderId': userId },
    { $set: { 'lastMessage.text': newText } },
  );

  // Broadcast edit to conversation room
  socketEmitter.emitToConversation(message.conversationId, 'message_edited', {
    messageId: message._id.toString(),
    text: newText,
    editedAt: message.editedAt,
  });

  eventBus.publish(APP_EVENT.MESSAGE_EDITED, {
    messageId: message._id.toString(),
    conversationId: message.conversationId.toString(),
    userId: String(userId),
    timestamp: new Date(),
  });

  return message.toClientObject(userId);
}

/**
 * Delete a message (for me vs for everyone).
 */
export async function deleteMessage({ userId, messageId, mode = 'for-me' }) {
  const message = await Message.findById(messageId);
  if (!message) {
    throw new NotFoundError('Message not found');
  }

  const userStr = String(userId);
  const isSender = String(message.senderId) === userStr;
  const isRecipient = String(message.recipientId) === userStr;

  if (!isSender && !isRecipient) {
    throw new NotFoundError('Message not found');
  }

  if (mode === 'for-everyone') {
    if (!isSender) {
      throw new AuthorizationError('Only the sender can delete a message for everyone');
    }

    message.isDeletedForEveryone = true;
    message.deletedForEveryoneAt = new Date();
    message.text = 'This message was deleted';
    message.attachments = [];
    await message.save();

    // Broadcast deletion to conversation room
    socketEmitter.emitToConversation(message.conversationId, 'message_deleted', {
      messageId: message._id.toString(),
      mode: 'for-everyone',
    });

    eventBus.publish(APP_EVENT.MESSAGE_DELETED, {
      messageId: message._id.toString(),
      conversationId: message.conversationId.toString(),
      mode: 'for-everyone',
      userId: userStr,
      timestamp: new Date(),
    });
  } else {
    // Delete for me
    if (!message.deletedByUsers.some((id) => String(id) === userStr)) {
      message.deletedByUsers.push(new mongoose.Types.ObjectId(userId));
      await message.save();
    }
  }

  return { message: 'Message deleted successfully.' };
}

/**
 * Mark a conversation's messages as read.
 */
export async function markConversationAsRead({ userId, conversationId }) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new NotFoundError('Conversation not found');
  }

  const userStr = String(userId);
  if (!conversation.isMember(userId)) {
    throw new NotFoundError('Conversation not found');
  }

  const now = new Date();

  // Mark all unread incoming messages as read
  if (conversation.isGroup) {
    await Message.updateMany(
      {
        conversationId,
        senderId: { $ne: userId },
        isRead: false,
      },
      {
        $set: { isRead: true, readAt: now },
      },
    );
  } else {
    await Message.updateMany(
      {
        conversationId,
        recipientId: userId,
        isRead: false,
      },
      {
        $set: { isRead: true, readAt: now },
      },
    );
  }

  // Reset unread count for this user
  conversation.unreadCounts.set(userStr, 0);
  await conversation.save();

  // Broadcast read receipt to the conversation room
  socketEmitter.emitToConversation(conversationId, 'message_read', {
    conversationId: conversationId.toString(),
    readByUserId: userStr,
    readAt: now,
  });

  eventBus.publish(APP_EVENT.MESSAGE_READ, {
    conversationId: conversationId.toString(),
    userId: userStr,
    timestamp: now,
  });

  return { message: 'Conversation marked as read.' };
}

/**
 * Delete a conversation for the current user.
 * Other participant's conversation history remains intact.
 */
export async function deleteConversationForUser({ userId, conversationId }) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new NotFoundError('Conversation not found');
  }

  const userStr = String(userId);
  if (!conversation.isMember(userId)) {
    throw new NotFoundError('Conversation not found');
  }

  if (!conversation.deletedBy.some((id) => String(id) === userStr)) {
    conversation.deletedBy.push(new mongoose.Types.ObjectId(userId));
  }

  // Reset unread count for the user deleting the conversation
  conversation.unreadCounts.set(userStr, 0);
  await conversation.save();

  return { message: 'Conversation deleted.' };
}

/**
 * Create a new group conversation.
 */
export async function createGroupConversation(creatorId, { title, description = '', avatarUrl = null, memberUserIds = [] }) {
  if (!title || !title.trim()) {
    throw new ValidationError('Group title is required');
  }

  const creatorObjId = new mongoose.Types.ObjectId(creatorId);

  // Deduplicate and ensure creator is in members
  const memberSet = new Set([creatorId.toString(), ...memberUserIds.map((id) => id.toString())]);
  const members = Array.from(memberSet).map((id) => new mongoose.Types.ObjectId(id));

  // Verify that members exist
  const existingUsers = await User.find({ _id: { $in: members } }).select('_id displayName username').lean();
  const validMemberIds = existingUsers.map((u) => u._id);

  const convId = new mongoose.Types.ObjectId();
  const conversation = await Conversation.create({
    _id: convId,
    isGroup: true,
    title: title.trim(),
    description: (description || '').trim(),
    avatarUrl: avatarUrl || null,
    creatorId: creatorObjId,
    admins: [creatorObjId],
    members: validMemberIds,
    userLow: creatorObjId,
    userHigh: convId, // guarantees unique compound index
    lastMessageAt: new Date(),
  });

  // Create initial system message
  const creatorUser = existingUsers.find((u) => u._id.toString() === creatorId.toString());
  const creatorName = creatorUser?.displayName || creatorUser?.username || 'Admin';
  await Message.create({
    conversationId: convId,
    senderId: creatorObjId,
    type: 'system',
    text: `${creatorName} created group "${title.trim()}".`,
  });

  // Notify members via socket
  for (const m of validMemberIds) {
    socketEmitter.emitToUser(m.toString(), 'new_group_conversation', {
      conversationId: convId.toString(),
      title: title.trim(),
    });
  }

  return getConversationDetails(creatorId, convId);
}

/**
 * Get full group conversation details including members and roles.
 */
export async function getConversationDetails(userId, conversationId) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new NotFoundError('Conversation not found');
  }

  const userStr = String(userId);
  if (!conversation.isMember(userId)) {
    throw new AuthorizationError('You are not a member of this conversation');
  }

  if (!conversation.isGroup) {
    return {
      _id: conversation._id.toString(),
      id: conversation._id.toString(),
      isGroup: false,
    };
  }

  const memberIds = (conversation.members || []).map((m) => new mongoose.Types.ObjectId(m));
  const [users, profiles] = await Promise.all([
    User.find({ _id: { $in: memberIds } }).select('_id displayName username').lean(),
    Profile.find({ userId: { $in: memberIds } }).select('userId avatarUrl customTitle').lean(),
  ]);

  const profileMap = new Map();
  for (const p of profiles) {
    profileMap.set(p.userId.toString(), p);
  }

  const formattedMembers = users.map((u) => {
    const uStr = u._id.toString();
    const prof = profileMap.get(uStr);
    let role = 'MEMBER';
    if (conversation.isCreator(uStr)) {
      role = 'CREATOR';
    } else if (conversation.isAdmin(uStr)) {
      role = 'ADMIN';
    }

    return {
      id: uStr,
      _id: uStr,
      displayName: u.displayName || u.username || 'User',
      username: u.username || 'user',
      avatarUrl: prof?.avatarUrl || null,
      customTitle: prof?.customTitle || null,
      role,
      isCreator: role === 'CREATOR',
      isAdmin: role === 'ADMIN' || role === 'CREATOR',
    };
  });

  const currentUserRole = conversation.isCreator(userStr)
    ? 'CREATOR'
    : conversation.isAdmin(userStr)
    ? 'ADMIN'
    : 'MEMBER';

  return {
    _id: conversation._id.toString(),
    id: conversation._id.toString(),
    isGroup: true,
    title: conversation.title,
    description: conversation.description || '',
    avatarUrl: conversation.avatarUrl || null,
    creatorId: conversation.creatorId ? conversation.creatorId.toString() : null,
    memberCount: formattedMembers.length,
    createdAt: conversation.createdAt,
    lastMessageAt: conversation.lastMessageAt,
    currentUserRole,
    isAdmin: conversation.isAdmin(userStr),
    isCreator: conversation.isCreator(userStr),
    members: formattedMembers,
  };
}

/**
 * Add members to a group chat (Admin only).
 */
export async function addGroupMembers(adminId, conversationId, newMemberIds = []) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation || !conversation.isGroup) {
    throw new NotFoundError('Group conversation not found');
  }

  if (!conversation.isAdmin(adminId)) {
    throw new AuthorizationError('Only group admins can add members');
  }

  const currentMemberStrs = new Set(conversation.members.map((m) => m.toString()));
  const toAdd = newMemberIds
    .map((id) => id.toString())
    .filter((id) => !currentMemberStrs.has(id));

  if (toAdd.length === 0) {
    return getConversationDetails(adminId, conversationId);
  }

  const existingUsers = await User.find({ _id: { $in: toAdd } }).select('_id displayName username').lean();
  if (existingUsers.length === 0) {
    return getConversationDetails(adminId, conversationId);
  }

  for (const u of existingUsers) {
    conversation.members.push(u._id);
  }
  await conversation.save();

  // Create system message
  const adminUser = await User.findById(adminId).select('displayName username').lean();
  const adminName = adminUser?.displayName || adminUser?.username || 'An admin';
  const names = existingUsers.map((u) => u.displayName || u.username).join(', ');

  const systemMsg = await Message.create({
    conversationId: conversation._id,
    senderId: adminId,
    type: 'system',
    text: `${adminName} added ${names} to the group.`,
  });

  const formattedMsg = systemMsg.toClientObject(adminId, {
    id: adminId.toString(),
    displayName: adminName,
  });

  socketEmitter.emitToConversation(conversationId, 'new_message', {
    conversationId: conversationId.toString(),
    message: formattedMsg,
  });

  socketEmitter.emitToConversation(conversationId, 'group_members_updated', {
    conversationId: conversationId.toString(),
  });

  for (const u of existingUsers) {
    socketEmitter.emitToUser(u._id.toString(), 'new_group_conversation', {
      conversationId: conversationId.toString(),
      title: conversation.title,
    });
  }

  return getConversationDetails(adminId, conversationId);
}

/**
 * Remove a member from a group (Admin only).
 * Admins cannot remove the creator.
 * Non-creator admins cannot remove other admins.
 */
export async function removeGroupMember(adminId, conversationId, targetUserId) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation || !conversation.isGroup) {
    throw new NotFoundError('Group conversation not found');
  }

  const adminStr = String(adminId);
  const targetStr = String(targetUserId);

  if (!conversation.isAdmin(adminStr)) {
    throw new AuthorizationError('Only group admins can remove members');
  }

  if (conversation.isCreator(targetStr)) {
    throw new AuthorizationError('Cannot remove the group creator');
  }

  if (conversation.isAdmin(targetStr) && !conversation.isCreator(adminStr)) {
    throw new AuthorizationError('Only the group creator can remove another admin');
  }

  // Remove from members and admins
  conversation.members = conversation.members.filter((m) => m.toString() !== targetStr);
  conversation.admins = conversation.admins.filter((a) => a.toString() !== targetStr);
  await conversation.save();

  // Create system message
  const [adminUser, targetUser] = await Promise.all([
    User.findById(adminId).select('displayName username').lean(),
    User.findById(targetUserId).select('displayName username').lean(),
  ]);

  const adminName = adminUser?.displayName || adminUser?.username || 'An admin';
  const targetName = targetUser?.displayName || targetUser?.username || 'A member';

  const systemMsg = await Message.create({
    conversationId: conversation._id,
    senderId: adminId,
    type: 'system',
    text: `${adminName} removed ${targetName} from the group.`,
  });

  const formattedMsg = systemMsg.toClientObject(adminId, {
    id: adminId.toString(),
    displayName: adminName,
  });

  socketEmitter.emitToConversation(conversationId, 'new_message', {
    conversationId: conversationId.toString(),
    message: formattedMsg,
  });

  socketEmitter.emitToConversation(conversationId, 'group_members_updated', {
    conversationId: conversationId.toString(),
  });

  socketEmitter.emitToUser(targetStr, 'removed_from_group', {
    conversationId: conversationId.toString(),
    title: conversation.title,
  });

  return getConversationDetails(adminId, conversationId);
}

/**
 * Appoint a member to Admin or demote an Admin back to Member.
 * Creator cannot be demoted.
 * Only creator can demote an admin.
 * Any admin can promote another member to admin.
 */
export async function updateGroupMemberRole(adminId, conversationId, { targetUserId, role }) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation || !conversation.isGroup) {
    throw new NotFoundError('Group conversation not found');
  }

  const adminStr = String(adminId);
  const targetStr = String(targetUserId);

  if (!conversation.isAdmin(adminStr)) {
    throw new AuthorizationError('Only group admins can change roles');
  }

  if (!conversation.isMember(targetStr)) {
    throw new ValidationError('User is not a member of this group');
  }

  if (conversation.isCreator(targetStr)) {
    throw new AuthorizationError('The creator role cannot be modified');
  }

  const isCurrentAdmin = conversation.isAdmin(targetStr);

  if (role === 'ADMIN') {
    if (!isCurrentAdmin) {
      conversation.admins.push(new mongoose.Types.ObjectId(targetUserId));
    }
  } else if (role === 'MEMBER') {
    if (isCurrentAdmin) {
      if (!conversation.isCreator(adminStr)) {
        throw new AuthorizationError('Only the creator can demote an admin');
      }
      conversation.admins = conversation.admins.filter((a) => a.toString() !== targetStr);
    }
  } else {
    throw new ValidationError('Invalid role. Role must be ADMIN or MEMBER');
  }

  await conversation.save();

  // Create system message
  const [adminUser, targetUser] = await Promise.all([
    User.findById(adminId).select('displayName username').lean(),
    User.findById(targetUserId).select('displayName username').lean(),
  ]);

  const adminName = adminUser?.displayName || adminUser?.username || 'An admin';
  const targetName = targetUser?.displayName || targetUser?.username || 'A member';

  const systemMsg = await Message.create({
    conversationId: conversation._id,
    senderId: adminId,
    type: 'system',
    text: `${adminName} appointed ${targetName} as ${role === 'ADMIN' ? 'an Admin' : 'a Member'}.`,
  });

  const formattedMsg = systemMsg.toClientObject(adminId, {
    id: adminId.toString(),
    displayName: adminName,
  });

  socketEmitter.emitToConversation(conversationId, 'new_message', {
    conversationId: conversationId.toString(),
    message: formattedMsg,
  });

  socketEmitter.emitToConversation(conversationId, 'group_members_updated', {
    conversationId: conversationId.toString(),
  });

  return getConversationDetails(adminId, conversationId);
}

/**
 * Leave a group chat.
 * If the creator leaves, ownership transfers to another admin or the first member.
 */
export async function leaveGroup(userId, conversationId) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation || !conversation.isGroup) {
    throw new NotFoundError('Group conversation not found');
  }

  const userStr = String(userId);
  if (!conversation.isMember(userStr)) {
    throw new AuthorizationError('You are not a member of this group');
  }

  if (conversation.isCreator(userStr)) {
    if (conversation.members.length > 1) {
      const nextAdmin =
        conversation.admins.find((a) => a.toString() !== userStr) ||
        conversation.members.find((m) => m.toString() !== userStr);

      if (nextAdmin) {
        conversation.creatorId = nextAdmin;
        if (!conversation.isAdmin(nextAdmin.toString())) {
          conversation.admins.push(nextAdmin);
        }
      }
    }
  }

  conversation.members = conversation.members.filter((m) => m.toString() !== userStr);
  conversation.admins = conversation.admins.filter((a) => a.toString() !== userStr);
  await conversation.save();

  const user = await User.findById(userId).select('displayName username').lean();
  const userName = user?.displayName || user?.username || 'A member';

  const systemMsg = await Message.create({
    conversationId: conversation._id,
    senderId: userId,
    type: 'system',
    text: `${userName} left the group.`,
  });

  const formattedMsg = systemMsg.toClientObject(userId, {
    id: userStr,
    displayName: userName,
  });

  socketEmitter.emitToConversation(conversationId, 'new_message', {
    conversationId: conversationId.toString(),
    message: formattedMsg,
  });

  socketEmitter.emitToConversation(conversationId, 'group_members_updated', {
    conversationId: conversationId.toString(),
  });

  return { message: 'You have left the group.' };
}

/**
 * Update group title, description, or avatar.
 */
export async function updateGroupInfo(adminId, conversationId, { title, description, avatarUrl }) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation || !conversation.isGroup) {
    throw new NotFoundError('Group conversation not found');
  }

  if (!conversation.isAdmin(adminId)) {
    throw new AuthorizationError('Only group admins can update group information');
  }

  if (title !== undefined && title.trim()) {
    conversation.title = title.trim();
  }
  if (description !== undefined) {
    conversation.description = description.trim();
  }
  if (avatarUrl !== undefined) {
    conversation.avatarUrl = avatarUrl;
  }

  await conversation.save();

  socketEmitter.emitToConversation(conversationId, 'group_info_updated', {
    conversationId: conversationId.toString(),
    title: conversation.title,
    description: conversation.description,
    avatarUrl: conversation.avatarUrl,
  });

  return getConversationDetails(adminId, conversationId);
}

