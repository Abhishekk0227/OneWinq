import { organizationTransferService } from './organizationTransfer.service.js';
import { HTTP } from '../../config/constants.js';

export const organizationTransferController = {
  /**
   * POST /api/v1/organizations/:organizationId/ownership-transfer/initiate
   */
  async initiate(req, res, next) {
    try {
      const { organizationId } = req.params;
      const { toUserId, toUserIdentifier } = req.body;
      const fromUserId = req.user.id || req.user._id;

      const result = await organizationTransferService.initiateTransfer({
        organizationId,
        fromUserId,
        toUserIdOrIdentifier: toUserId || toUserIdentifier,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(HTTP.CREATED).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/organizations/:organizationId/ownership-transfer
   */
  async getActive(req, res, next) {
    try {
      const { organizationId } = req.params;
      const userId = req.user.id || req.user._id;

      const result = await organizationTransferService.getActiveTransfer(organizationId, userId);

      res.status(HTTP.OK).json({
        success: true,
        data: { transferRequest: result },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/organizations/ownership-transfer/verify/:token
   */
  async verifyByToken(req, res, next) {
    try {
      const { token } = req.params;
      const currentUserId = req.user?.id || req.user?._id;

      const result = await organizationTransferService.getTransferByToken(token, currentUserId);

      res.status(HTTP.OK).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/organizations/ownership-transfer/respond
   */
  async respond(req, res, next) {
    try {
      const { token, action } = req.body;
      const userId = req.user.id || req.user._id;

      const result = await organizationTransferService.respondToTransfer({
        token,
        userId,
        action: String(action).toUpperCase(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(HTTP.OK).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/organizations/:organizationId/ownership-transfer/cancel
   */
  async cancel(req, res, next) {
    try {
      const { organizationId } = req.params;
      const userId = req.user.id || req.user._id;

      const result = await organizationTransferService.cancelTransfer({
        organizationId,
        userId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(HTTP.OK).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },
};
