import * as conversationService from './conversation.service.js';
import { sendSuccess } from '../../shared/response.js';

export async function getUserConversationsController(req, res, next) {
  try {
    const result = await conversationService.getUserConversations(req.user.id, {
      cursor: req.query.cursor,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
    });
    return sendSuccess(res, {
      message: 'Conversations retrieved.',
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

import * as chatFolderService from './chatFolder.service.js';

export async function getOrCreateConversationController(req, res, next) {
  try {
    const conversation = await conversationService.getOrCreateConversation(
      req.user.id,
      req.body.targetUserId,
    );
    const convId = conversation._id.toString();
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Conversation initialized.',
      data: {
        conversationId: convId,
        conversation: {
          _id: convId,
          id: convId,
          userLow: conversation.userLow,
          userHigh: conversation.userHigh,
          lastMessageAt: conversation.lastMessageAt,
          lastMessage: conversation.lastMessage,
        },
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function getMessagesController(req, res, next) {
  try {
    const result = await conversationService.getMessages(req.user.id, req.params.id, {
      cursor: req.query.cursor,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
    });
    return sendSuccess(res, {
      message: 'Messages retrieved.',
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

export async function sendMessageController(req, res, next) {
  try {
    const message = await conversationService.sendMessage({
      senderId: req.user.id,
      conversationId: req.params.id,
      text: req.body.text,
      type: req.body.type,
      attachments: req.body.attachments,
    });
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Message sent.',
      data: { message },
    });
  } catch (err) {
    return next(err);
  }
}

export async function editMessageController(req, res, next) {
  try {
    const message = await conversationService.editMessage({
      userId: req.user.id,
      messageId: req.params.messageId,
      newText: req.body.text,
    });
    return sendSuccess(res, {
      message: 'Message updated.',
      data: { message },
    });
  } catch (err) {
    return next(err);
  }
}

export async function deleteMessageController(req, res, next) {
  try {
    const mode = req.query.mode || 'for-me';
    const result = await conversationService.deleteMessage({
      userId: req.user.id,
      messageId: req.params.messageId,
      mode,
    });
    return sendSuccess(res, {
      message: result.message,
      data: null,
    });
  } catch (err) {
    return next(err);
  }
}

export async function markReadController(req, res, next) {
  try {
    const result = await conversationService.markConversationAsRead({
      userId: req.user.id,
      conversationId: req.params.id,
    });
    return sendSuccess(res, {
      message: result.message,
      data: null,
    });
  } catch (err) {
    return next(err);
  }
}

export async function deleteConversationController(req, res, next) {
  try {
    const result = await conversationService.deleteConversationForUser({
      userId: req.user.id,
      conversationId: req.params.id,
    });
    return sendSuccess(res, {
      message: result.message,
      data: null,
    });
  } catch (err) {
    return next(err);
  }
}

// ---------------------------------------------------------------------------
// Chat Folders
// ---------------------------------------------------------------------------

export async function getUserFoldersController(req, res, next) {
  try {
    const folders = await chatFolderService.getUserFolders(req.user.id);
    return sendSuccess(res, {
      message: 'Folders retrieved.',
      data: { folders },
    });
  } catch (err) {
    return next(err);
  }
}

export async function createFolderController(req, res, next) {
  try {
    const folder = await chatFolderService.createFolder(req.user.id, {
      name: req.body.name,
      color: req.body.color,
      icon: req.body.icon,
      memberUserIds: req.body.memberUserIds,
    });
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Folder created.',
      data: { folder },
    });
  } catch (err) {
    return next(err);
  }
}

export async function updateFolderController(req, res, next) {
  try {
    const folder = await chatFolderService.updateFolder(req.user.id, req.params.folderId, {
      name: req.body.name,
      color: req.body.color,
      icon: req.body.icon,
      memberUserIds: req.body.memberUserIds,
    });
    return sendSuccess(res, {
      message: 'Folder updated.',
      data: { folder },
    });
  } catch (err) {
    return next(err);
  }
}

export async function deleteFolderController(req, res, next) {
  try {
    const result = await chatFolderService.deleteFolder(req.user.id, req.params.folderId);
    return sendSuccess(res, {
      message: result.message,
      data: null,
    });
  } catch (err) {
    return next(err);
  }
}

export async function toggleFolderMemberController(req, res, next) {
  try {
    const result = await chatFolderService.toggleFolderMember(
      req.user.id,
      req.params.folderId,
      req.body.memberUserId,
    );
    return sendSuccess(res, {
      message: 'Folder member updated.',
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

export async function setUserFoldersController(req, res, next) {
  try {
    const folders = await chatFolderService.setUserFolders(
      req.user.id,
      req.body.targetUserId,
      req.body.folderIds,
    );
    return sendSuccess(res, {
      message: 'User folders updated.',
      data: { folders },
    });
  } catch (err) {
    return next(err);
  }
}

// ---------------------------------------------------------------------------
// Group Chat Controllers
// ---------------------------------------------------------------------------

export async function createGroupController(req, res, next) {
  try {
    const group = await conversationService.createGroupConversation(req.user.id, {
      title: req.body.title,
      description: req.body.description,
      avatarUrl: req.body.avatarUrl,
      memberUserIds: req.body.memberUserIds,
    });
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Group created successfully.',
      data: { conversation: group },
    });
  } catch (err) {
    return next(err);
  }
}

export async function getConversationDetailsController(req, res, next) {
  try {
    const details = await conversationService.getConversationDetails(req.user.id, req.params.id);
    return sendSuccess(res, {
      message: 'Conversation details retrieved.',
      data: details,
    });
  } catch (err) {
    return next(err);
  }
}

export async function addGroupMembersController(req, res, next) {
  try {
    const details = await conversationService.addGroupMembers(
      req.user.id,
      req.params.id,
      req.body.memberUserIds,
    );
    return sendSuccess(res, {
      message: 'Members added to group.',
      data: details,
    });
  } catch (err) {
    return next(err);
  }
}

export async function removeGroupMemberController(req, res, next) {
  try {
    const details = await conversationService.removeGroupMember(
      req.user.id,
      req.params.id,
      req.params.memberId,
    );
    return sendSuccess(res, {
      message: 'Member removed from group.',
      data: details,
    });
  } catch (err) {
    return next(err);
  }
}

export async function updateMemberRoleController(req, res, next) {
  try {
    const details = await conversationService.updateGroupMemberRole(
      req.user.id,
      req.params.id,
      {
        targetUserId: req.body.targetUserId,
        role: req.body.role,
      },
    );
    return sendSuccess(res, {
      message: 'Member role updated.',
      data: details,
    });
  } catch (err) {
    return next(err);
  }
}

export async function updateGroupInfoController(req, res, next) {
  try {
    const details = await conversationService.updateGroupInfo(
      req.user.id,
      req.params.id,
      req.body,
    );
    return sendSuccess(res, {
      message: 'Group updated.',
      data: details,
    });
  } catch (err) {
    return next(err);
  }
}

export async function leaveGroupController(req, res, next) {
  try {
    const result = await conversationService.leaveGroup(req.user.id, req.params.id);
    return sendSuccess(res, {
      message: result.message,
      data: null,
    });
  } catch (err) {
    return next(err);
  }
}


