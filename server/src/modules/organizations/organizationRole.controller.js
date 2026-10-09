import * as roleService from './organizationRole.service.js';
import { successResponse } from '../../shared/response.js';

export async function listRoles(req, res, next) {
  try {
    const roles = await roleService.listRoles(req.orgContext.organizationId);
    return res.status(200).json(successResponse({ roles }, 'Roles retrieved successfully'));
  } catch (err) {
    return next(err);
  }
}

export async function createRole(req, res, next) {
  try {
    const role = await roleService.createRole(req.orgContext.organizationId, req.body);
    return res.status(201).json(successResponse({ role }, 'Custom role created successfully'));
  } catch (err) {
    return next(err);
  }
}

export async function updateRole(req, res, next) {
  try {
    const role = await roleService.updateRole(
      req.orgContext.organizationId,
      req.params.roleId,
      req.body,
    );
    return res.status(200).json(successResponse({ role }, 'Custom role updated successfully'));
  } catch (err) {
    return next(err);
  }
}

export async function deleteRole(req, res, next) {
  try {
    const result = await roleService.deleteRole(
      req.orgContext.organizationId,
      req.params.roleId,
    );
    return res.status(200).json(successResponse(result, 'Custom role deleted successfully'));
  } catch (err) {
    return next(err);
  }
}
