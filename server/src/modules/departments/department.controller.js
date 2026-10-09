import * as departmentService from './department.service.js';
import { sendSuccess } from '../../shared/response.js';
import { HTTP } from '../../config/constants.js';

export const departmentController = {
  async list(req, res, next) {
    try {
      const departments = await departmentService.listDepartments(req.params.organizationId);
      return sendSuccess(res, {
        statusCode: HTTP.OK,
        message: 'Departments retrieved successfully',
        data: { departments },
      });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const department = await departmentService.createDepartment(
        req.params.organizationId,
        req.body,
      );
      return sendSuccess(res, {
        statusCode: HTTP.CREATED,
        message: 'Department created successfully',
        data: { department },
      });
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const department = await departmentService.getDepartmentById(
        req.params.organizationId,
        req.params.departmentId,
      );
      return sendSuccess(res, {
        statusCode: HTTP.OK,
        message: 'Department retrieved successfully',
        data: { department },
      });
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const department = await departmentService.updateDepartment(
        req.params.organizationId,
        req.params.departmentId,
        req.body,
      );
      return sendSuccess(res, {
        statusCode: HTTP.OK,
        message: 'Department updated successfully',
        data: { department },
      });
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      const result = await departmentService.deleteDepartment(
        req.params.organizationId,
        req.params.departmentId,
      );
      return sendSuccess(res, {
        statusCode: HTTP.OK,
        message: 'Department deleted successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },
};
