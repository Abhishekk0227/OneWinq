import mongoose from 'mongoose';
import { Organization } from '../modules/organizations/organization.model.js';
import { OrganizationMember } from '../modules/organizations/organizationMember.model.js';
import {
  ORGANIZATION_MEMBER_STATUS,
  ORGANIZATION_STATUS,
  DEFAULT_ROLE_PERMISSIONS,
  ERROR_CODE,
  HTTP,
} from '../config/constants.js';
import { AppError, NotFoundError, ForbiddenError } from '../shared/errors.js';

/**
 * Middleware that resolves and validates organization context for multi-tenant endpoints.
 * Populates:
 *   - req.organization: The Organization Mongoose document
 *   - req.membership: The user's active OrganizationMember document
 *   - req.orgPermissions: Array of string permissions granted to the member
 */
export async function resolveOrgContext(req, _res, next) {
  try {
    if (!req.user?.id) {
      throw new AppError(
        'Authentication required',
        ERROR_CODE.AUTHENTICATION_REQUIRED,
        HTTP.UNAUTHORIZED,
      );
    }

    // Resolve organization ID from route params, or query, or custom header
    const rawOrgId =
      req.params.organizationId ||
      req.headers['x-organization-id'] ||
      req.query.organizationId;

    if (!rawOrgId) {
      throw new AppError(
        'Organization ID is required in route params or x-organization-id header',
        ERROR_CODE.VALIDATION_ERROR,
        HTTP.BAD_REQUEST,
      );
    }

    if (!mongoose.Types.ObjectId.isValid(rawOrgId)) {
      throw new AppError(
        'Invalid organization ID format',
        ERROR_CODE.VALIDATION_ERROR,
        HTTP.BAD_REQUEST,
      );
    }

    const orgId = new mongoose.Types.ObjectId(rawOrgId);

    // 1. Fetch organization
    const organization = await Organization.findById(orgId);
    if (!organization) {
      throw new NotFoundError('Organization not found', ERROR_CODE.ORGANIZATION_NOT_FOUND);
    }

    if (organization.status === ORGANIZATION_STATUS.DEACTIVATED) {
      throw new ForbiddenError(
        'This organization has been deactivated',
        ERROR_CODE.ORGANIZATION_ACCESS_DENIED,
      );
    }

    // 2. Platform SUPER_ADMIN bypass check
    if (req.user.role === 'SUPER_ADMIN') {
      req.organization = organization;
      req.membership = {
        role: 'OWNER',
        status: 'ACTIVE',
        isSuperAdminBypass: true,
      };
      req.orgPermissions = DEFAULT_ROLE_PERMISSIONS.OWNER;
      return next();
    }

    // 3. Fetch user's membership in this organization
    const membership = await OrganizationMember.findOne({
      organizationId: orgId,
      userId: req.user.id,
      status: ORGANIZATION_MEMBER_STATUS.ACTIVE,
    });

    if (!membership) {
      throw new ForbiddenError(
        'You are not an active member of this organization',
        ERROR_CODE.ORGANIZATION_ACCESS_DENIED,
      );
    }

    // 4. Compute effective permissions
    const basePermissions = DEFAULT_ROLE_PERMISSIONS[membership.role] || [];
    const effectivePermissions = Array.from(
      new Set([...basePermissions, ...(membership.permissions || [])]),
    );

    req.organization = organization;
    req.membership = membership;
    req.orgPermissions = effectivePermissions;

    next();
  } catch (err) {
    next(err);
  }
}
