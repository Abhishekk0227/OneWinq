import { AppError, ForbiddenError } from '../shared/errors.js';
import { ERROR_CODE, HTTP, ORGANIZATION_ROLE } from '../config/constants.js';

/**
 * Middleware factory requiring the active organization member to possess a specific permission.
 * Assumes resolveOrgContext has already run.
 *
 * @param {string} permission - The required permission string (e.g. 'org:edit', 'jobs:create')
 */
export function requireOrgPermission(permission) {
  return (req, _res, next) => {
    try {
      if (!req.membership) {
        throw new AppError(
          'Organization context resolution required',
          ERROR_CODE.INTERNAL_ERROR,
          HTTP.INTERNAL,
        );
      }

      // Owner always has all permissions
      if (req.membership.role === ORGANIZATION_ROLE.OWNER || req.membership.isSuperAdminBypass) {
        return next();
      }

      const permissions = req.orgPermissions || [];
      if (!permissions.includes(permission)) {
        throw new ForbiddenError(
          `Access denied: Missing required organization permission "${permission}"`,
        );
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

/**
 * Middleware requiring the member to be OWNER or ADMIN in the organization.
 */
export function requireOrgAdmin(req, res, next) {
  if (!req.membership) {
    return next(new ForbiddenError('Organization membership required'));
  }

  const role = req.membership.role;
  if (role === ORGANIZATION_ROLE.OWNER || role === ORGANIZATION_ROLE.ADMIN || req.membership.isSuperAdminBypass) {
    return next();
  }

  return next(new ForbiddenError('Access denied: Organization Admin privileges required'));
}

/**
 * Middleware requiring the member to be the OWNER of the organization.
 */
export function requireOrgOwner(req, res, next) {
  if (!req.membership) {
    return next(new ForbiddenError('Organization membership required'));
  }

  if (req.membership.role === ORGANIZATION_ROLE.OWNER || req.membership.isSuperAdminBypass) {
    return next();
  }

  return next(new ForbiddenError('Access denied: Organization Owner privileges required'));
}
