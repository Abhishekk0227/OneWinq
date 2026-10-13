import * as organizationService from './organization.service.js';
import * as followService from './organizationFollow.service.js';
import { analyticsService } from '../analytics/analytics.service.js';
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
      if (organization) {
        analyticsService.recordEvent({
          eventType: 'organization.viewed',
          organizationId: organization._id || organization.id,
          actorUserId: req.user?.id || null,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        }).catch(() => {});
      }
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
      const result = await organizationService.listPublicOrganizations({
        ...req.query,
        currentUserId: req.user?.id,
      });
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

  /**
   * Toggle follow/unfollow an organization.
   */
  async toggleFollow(req, res, next) {
    try {
      const result = await followService.toggleFollowOrganization(
        req.user.id,
        req.params.organizationId,
      );
      return sendSuccess(res, {
        statusCode: HTTP.OK,
        message: result.isFollowing ? 'Organization followed' : 'Organization unfollowed',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get follow status for an organization.
   */
  async getFollowStatus(req, res, next) {
    try {
      const userId = req.user?.id || null;
      const result = await followService.getFollowStatus(userId, req.params.organizationId);
      return sendSuccess(res, {
        statusCode: HTTP.OK,
        message: 'Follow status retrieved',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get organizations followed by current user.
   */
  async getMyFollowedOrganizations(req, res, next) {
    try {
      const result = await followService.getFollowedOrganizations(req.user.id, req.query);
      return sendSuccess(res, {
        statusCode: HTTP.OK,
        message: 'Followed organizations retrieved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get organization analytics telemetry.
   */
  async getAnalytics(req, res, next) {
    try {
      const period = req.query.period || req.query.range || '30d';
      const data = await analyticsService.getOrganizationAnalytics(
        req.params.organizationId,
        { period },
      );
      return sendSuccess(res, {
        statusCode: HTTP.OK,
        message: 'Organization analytics retrieved successfully',
        data,
      });
    } catch (err) {
      next(err);
    }
  },
};

