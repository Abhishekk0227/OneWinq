import { entitlementService } from '../modules/subscriptions/entitlement.service.js';
import { AppError } from '../shared/errors.js';
import { ERROR_CODE, HTTP } from '../config/constants.js';

/**
 * Middleware factory requiring a specific feature entitlement.
 * Assumes req.user is populated by authenticate middleware.
 * @param {string} featureFlag
 */
export function requireFeature(featureFlag) {
  return async (req, res, next) => {
    try {
      if (!req.user?.id) {
        throw new AppError(
          'Authentication required',
          ERROR_CODE.AUTHENTICATION_REQUIRED,
          HTTP.UNAUTHORIZED
        );
      }

      const hasAccess = await entitlementService.hasFeature(req.user.id, featureFlag);
      if (!hasAccess) {
        throw new AppError(
          `This feature requires a plan upgrade.`,
          ERROR_CODE.PLAN_UPGRADE_REQUIRED,
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
 * Middleware that loads and attaches current user's entitlements to req.entitlements.
 */
export async function attachEntitlements(req, res, next) {
  try {
    if (req.user?.id) {
      req.entitlements = await entitlementService.getEntitlements(req.user.id);
    }
    return next();
  } catch (err) {
    return next(err);
  }
}
