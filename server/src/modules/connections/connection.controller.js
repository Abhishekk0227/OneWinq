import * as connectionService from './connection.service.js';
import { sendSuccess } from '../../shared/response.js';

export async function sendRequestController(req, res, next) {
  try {
    const toUserId = req.body.targetUserId || req.body.recipientId;
    const result = await connectionService.sendConnectionRequest({
      fromUserId: req.user.id,
      toUserId,
      note: req.body.note,
    });
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Connection request sent.',
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

export async function acceptRequestController(req, res, next) {
  try {
    const result = await connectionService.acceptConnectionRequest({
      userId: req.user.id,
      requestId: req.params.id,
    });
    return sendSuccess(res, {
      message: 'Connection request accepted.',
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

export async function rejectRequestController(req, res, next) {
  try {
    const result = await connectionService.rejectConnectionRequest({
      userId: req.user.id,
      requestId: req.params.id,
    });
    return sendSuccess(res, {
      message: result.message,
      data: null,
    });
  } catch (err) {
    return next(err);
  }
}

export async function withdrawRequestController(req, res, next) {
  try {
    const result = await connectionService.withdrawConnectionRequest({
      userId: req.user.id,
      requestId: req.params.id,
    });
    return sendSuccess(res, {
      message: result.message,
      data: null,
    });
  } catch (err) {
    return next(err);
  }
}

export async function removeConnectionController(req, res, next) {
  try {
    const result = await connectionService.removeConnection({
      userId: req.user.id,
      targetUserId: req.params.targetUserId,
    });
    return sendSuccess(res, {
      message: result.message,
      data: null,
    });
  } catch (err) {
    return next(err);
  }
}

export async function blockUserController(req, res, next) {
  try {
    const result = await connectionService.blockUser({
      userId: req.user.id,
      targetUserId: req.params.targetUserId,
    });
    return sendSuccess(res, {
      message: result.message,
      data: null,
    });
  } catch (err) {
    return next(err);
  }
}

export async function unblockUserController(req, res, next) {
  try {
    const result = await connectionService.unblockUser({
      userId: req.user.id,
      targetUserId: req.params.targetUserId,
    });
    return sendSuccess(res, {
      message: result.message,
      data: null,
    });
  } catch (err) {
    return next(err);
  }
}

export async function getConnectionsController(req, res, next) {
  try {
    const result = await connectionService.getConnections(req.user.id, {
      cursor: req.query.cursor,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
    });
    return sendSuccess(res, {
      message: 'Connections retrieved.',
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

export async function getPendingRequestsController(req, res, next) {
  try {
    const result = await connectionService.getPendingRequests(req.user.id, {
      direction: req.query.direction || 'incoming',
      cursor: req.query.cursor,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
    });
    return sendSuccess(res, {
      message: 'Pending requests retrieved.',
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

export async function getBlockedUsersController(req, res, next) {
  try {
    const result = await connectionService.getBlockedUsers(req.user.id, {
      cursor: req.query.cursor,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
    });
    return sendSuccess(res, {
      message: 'Blocked users retrieved.',
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

export async function getMutualConnectionsController(req, res, next) {
  try {
    const mutuals = await connectionService.getMutualConnections(
      req.user.id,
      req.params.targetUserId,
    );
    return sendSuccess(res, {
      message: 'Mutual connections retrieved.',
      data: { mutualConnections: mutuals },
    });
  } catch (err) {
    return next(err);
  }
}
