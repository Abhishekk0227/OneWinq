import { User } from '../modules/users/user.model.js';
import { AppError } from '../shared/errors.js';
import { ERROR_CODE, HTTP, ADMIN_ROLE } from '../config/constants.js';

/**
 * Middleware factory requiring user to possess one of the specified administrative roles.
 * @param  {...string} allowedRoles
 */
export function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    try {
      if (!req.user?.id) {
        throw new AppError(
          'Authentication required',
          ERROR_CODE.AUTHENTICATION_REQUIRED,
          HTTP.UNAUTHORIZED
        );
      }

      let userRole = req.user.role;
      if (!userRole) {
        const user = await User.findById(req.user.id).select('role');
        userRole = user?.role || 'USER';
        req.user.role = userRole;
      }

      if (!allowedRoles.includes(userRole)) {
        throw new AppError(
          'Access denied: Insufficient administrative privileges',
          ERROR_CODE.FORBIDDEN,
          HTTP.FORBIDDEN
        );
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

/**
 * Middleware shortcut requiring either ADMIN or SUPER_ADMIN role.
 */
export const requireAdmin = requireRole(ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN);

/**
 * Middleware shortcut requiring SUPER_ADMIN role.
 */
export const requireSuperAdmin = requireRole(ADMIN_ROLE.SUPER_ADMIN);

/**
 * Middleware shortcut requiring SUPER_ADMIN, ADMIN, or SUPPORT role.
 */
export const requireStaff = requireRole(
  ADMIN_ROLE.SUPER_ADMIN,
  ADMIN_ROLE.ADMIN,
  ADMIN_ROLE.SUPPORT
);

