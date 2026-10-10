import * as roleService from './organizationRole.service.js';
import { sendSuccess } from '../../shared/response.js';
import { HTTP } from '../../config/constants.js';

export async function listRoles(req, res, next) {
  try {
    const orgId = req.organization?._id || req.params.organizationId;
    const roles = await roleService.listRoles(orgId);
    return sendSuccess(res, {
      statusCode: HTTP.OK,
      message: 'Roles retrieved successfully',
      data: { roles },
    });
  } catch (err) {
    return next(err);
  }
}

export async function createRole(req, res, next) {
  try {
    const orgId = req.organization?._id || req.params.organizationId;
    const role = await roleService.createRole(orgId, req.body);
    return sendSuccess(res, {
      statusCode: HTTP.CREATED,
      message: 'Custom role created successfully',
      data: { role },
    });
  } catch (err) {
    return next(err);
  }
}

export async function updateRole(req, res, next) {
  try {
    const orgId = req.organization?._id || req.params.organizationId;
    const role = await roleService.updateRole(
      orgId,
      req.params.roleId,
      req.body,
    );
    return sendSuccess(res, {
      statusCode: HTTP.OK,
      message: 'Custom role updated successfully',
      data: { role },
    });
  } catch (err) {
    return next(err);
  }
}

export async function deleteRole(req, res, next) {
  try {
    const orgId = req.organization?._id || req.params.organizationId;
    const result = await roleService.deleteRole(
      orgId,
      req.params.roleId,
    );
    return sendSuccess(res, {
      statusCode: HTTP.OK,
      message: 'Custom role deleted successfully',
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

