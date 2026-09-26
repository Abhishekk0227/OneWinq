import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import {
  getUserConversationsController,
  getOrCreateConversationController,
  getMessagesController,
  sendMessageController,
  editMessageController,
  deleteMessageController,
  markReadController,
  deleteConversationController,
  getUserFoldersController,
  createFolderController,
  updateFolderController,
  deleteFolderController,
  toggleFolderMemberController,
  setUserFoldersController,
  createGroupController,
  getConversationDetailsController,
  addGroupMembersController,
  removeGroupMemberController,
  updateMemberRoleController,
  updateGroupInfoController,
  leaveGroupController,
} from './conversation.controller.js';
import {
  validate,
  startConversationSchema,
  sendMessageSchema,
  editMessageSchema,
  deleteMessageQuerySchema,
  paginationSchema,
  createGroupSchema,
  addGroupMembersSchema,
  updateMemberRoleSchema,
  updateGroupInfoSchema,
} from './conversation.validation.js';

function withValidation(schema, source = 'body') {
  return (req, _res, next) => {
    try {
      const validated = validate(schema, req[source]);
      if (source === 'query') {
        Object.defineProperty(req, 'query', {
          value: validated,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      } else {
        req[source] = validated;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

const router = Router();

router.use(authenticate);

// ---------------------------------------------------------------------------
// Folders API
// ---------------------------------------------------------------------------
router.get('/folders', getUserFoldersController);
router.post('/folders', createFolderController);
router.put('/folders/:folderId', updateFolderController);
router.delete('/folders/:folderId', deleteFolderController);
router.post('/folders/:folderId/members', toggleFolderMemberController);
router.post('/folders/user-folders', setUserFoldersController);

// ---------------------------------------------------------------------------
// Group Chats API
// ---------------------------------------------------------------------------
router.post('/groups', withValidation(createGroupSchema, 'body'), createGroupController);

// GET /api/v1/conversations — list conversations
router.get('/', withValidation(paginationSchema, 'query'), getUserConversationsController);

// POST /api/v1/conversations — start/get conversation with target user
router.post('/', withValidation(startConversationSchema, 'body'), getOrCreateConversationController);

// GET /api/v1/conversations/:id/details — get conversation/group details
router.get('/:id/details', getConversationDetailsController);

// POST /api/v1/conversations/:id/members — add group members
router.post('/:id/members', withValidation(addGroupMembersSchema, 'body'), addGroupMembersController);

// DELETE /api/v1/conversations/:id/members/:memberId — remove group member
router.delete('/:id/members/:memberId', removeGroupMemberController);

// PUT /api/v1/conversations/:id/admins — appoint/demote admin
router.put('/:id/admins', withValidation(updateMemberRoleSchema, 'body'), updateMemberRoleController);

// PUT /api/v1/conversations/:id/group — update group info (title, description, avatar)
router.put('/:id/group', withValidation(updateGroupInfoSchema, 'body'), updateGroupInfoController);

// POST /api/v1/conversations/:id/leave — leave group
router.post('/:id/leave', leaveGroupController);

// GET /api/v1/conversations/:id/messages — get messages
router.get('/:id/messages', withValidation(paginationSchema, 'query'), getMessagesController);

// POST /api/v1/conversations/:id/messages — send message
router.post('/:id/messages', withValidation(sendMessageSchema, 'body'), sendMessageController);

// PUT /api/v1/conversations/messages/:messageId — edit message
router.put('/messages/:messageId', withValidation(editMessageSchema, 'body'), editMessageController);

// DELETE /api/v1/conversations/messages/:messageId — delete message (?mode=for-me | for-everyone)
router.delete(
  '/messages/:messageId',
  withValidation(deleteMessageQuerySchema, 'query'),
  deleteMessageController,
);

// POST /api/v1/conversations/:id/read — mark conversation as read
router.post('/:id/read', markReadController);

// DELETE /api/v1/conversations/:id — delete conversation for current user
router.delete('/:id', deleteConversationController);

export default router;

