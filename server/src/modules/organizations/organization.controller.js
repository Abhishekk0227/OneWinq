import * as organizationService from './organization.service.js';
import { sendSuccess } from '../../shared/response.js';
import { HTTP } from '../../config/constants.js';

export const organizationController = {
  /**
   * Create a new organization.
   */
  async create(req, res, next) {
    try {
      const organization = await organizationService.createOrganization(req.user.id, req.body);
      return sendSuccess(res, {
        statusCode: HTTP.CREATED,
        message: 'Organization created successfully',
        data: { organization },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get an organization by ID.
   */
  async getById(req, res, next) {
    try {
      const organization = await organizationService.getOrganizationById(req.params.organizationId);
      return sendSuccess(res, {
        statusCode: HTTP.OK,
        message: 'Organization retrieved successfully',
        data: { organization: organization.toSafeObject() },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get public organization profile by slug.
   */
  async getBySlug(req, res, next) {
    try {
      const organization = await organizationService.getOrganizationBySlug(req.params.slug);
      return sendSuccess(res, {
        statusCode: HTTP.OK,
        message: 'Organization retrieved successfully',
        data: { organization },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update organization details.
   */
  async update(req, res, next) {
    try {
      const organization = await organizationService.updateOrganization(
        req.params.organizationId,
        req.body,
      );
      return sendSuccess(res, {
        statusCode: HTTP.OK,
        message: 'Organization updated successfully',
        data: { organization },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * List organizations for public search/discovery.
   */
  async list(req, res, next) {
    try {
      const result = await organizationService.listPublicOrganizations(req.query);
      return sendSuccess(res, {
        statusCode: HTTP.OK,
        message: 'Organizations retrieved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get current user's organizations and memberships.
   */
  async getMyOrganizations(req, res, next) {
    try {
      const organizations = await organizationService.getUserOrganizations(req.user.id);
      return sendSuccess(res, {
        statusCode: HTTP.OK,
        message: 'User organizations retrieved successfully',
        data: { organizations },
      });
    } catch (err) {
      next(err);
    }
  },
};
