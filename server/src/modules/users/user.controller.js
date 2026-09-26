import { userService } from './user.service.js';
import { sendSuccess } from '../../shared/response.js';
import { HTTP } from '../../config/constants.js';

export const userController = {
  async getMe(req, res, next) {
    try {
      const user = await userService.getMe(req.user.id);
      return sendSuccess(res, HTTP.OK, 'Current user retrieved', { user });
    } catch (err) {
      next(err);
    }
  },

  async getUserById(req, res, next) {
    try {
      const user = await userService.getUserById(req.params.id);
      return sendSuccess(res, HTTP.OK, 'User details retrieved', { user });
    } catch (err) {
      next(err);
    }
  },

  async updatePrivacySettings(req, res, next) {
    try {
      const user = await userService.updatePrivacySettings(req.user.id, req.body);
      return sendSuccess(res, HTTP.OK, 'Privacy preferences updated', { user });
    } catch (err) {
      next(err);
    }
  },

  async updateMe(req, res, next) {
    try {
      const user = await userService.updateMe(req.user.id, req.body);
      return sendSuccess(res, HTTP.OK, 'User details updated', { user });
    } catch (err) {
      next(err);
    }
  },

  async listUsers(req, res, next) {
    try {
      const { q, limit, cursor } = req.query;
      const data = await userService.listUsers({ query: q, limit, cursor });
      return sendSuccess(res, HTTP.OK, 'Users retrieved', data);
    } catch (err) {
      next(err);
    }
  },
};
