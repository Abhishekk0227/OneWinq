import * as jobService from './job.service.js';
import { sendSuccess } from '../../shared/response.js';
import { HTTP } from '../../config/constants.js';

export const jobController = {
  async create(req, res, next) {
    try {
      const job = await jobService.createJob(
        req.params.organizationId,
        req.user.id,
        req.body,
      );
      return sendSuccess(res, {
        statusCode: HTTP.CREATED,
        message: 'Job posting created successfully',
        data: { job },
      });
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const job = await jobService.updateJob(
        req.params.organizationId,
        req.params.jobId,
        req.body,
      );
      return sendSuccess(res, {
        statusCode: HTTP.OK,
        message: 'Job posting updated successfully',
        data: { job },
      });
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      const result = await jobService.deleteJob(
        req.params.organizationId,
        req.params.jobId,
      );
      return sendSuccess(res, {
        statusCode: HTTP.OK,
        message: 'Job posting deleted successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  async listOrgJobs(req, res, next) {
    try {
      const result = await jobService.listOrganizationJobs(
        req.params.organizationId,
        req.query,
      );
      return sendSuccess(res, {
        statusCode: HTTP.OK,
        message: 'Organization jobs retrieved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  async getPublicJob(req, res, next) {
    try {
      const job = await jobService.getJobById(req.params.jobId);
      return sendSuccess(res, {
        statusCode: HTTP.OK,
        message: 'Job details retrieved successfully',
        data: { job },
      });
    } catch (err) {
      next(err);
    }
  },

  async listPublicJobs(req, res, next) {
    try {
      const result = await jobService.listPublicJobs(req.query);
      return sendSuccess(res, {
        statusCode: HTTP.OK,
        message: 'Jobs retrieved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  async apply(req, res, next) {
    try {
      const application = await jobService.applyToJob(
        req.params.jobId,
        req.user.id,
        req.body,
      );
      return sendSuccess(res, {
        statusCode: HTTP.CREATED,
        message: 'Application submitted successfully',
        data: { application },
      });
    } catch (err) {
      next(err);
    }
  },

  async listApplications(req, res, next) {
    try {
      const result = await jobService.listJobApplications(
        req.params.organizationId,
        req.params.jobId || req.query.jobId,
        req.query,
      );
      return sendSuccess(res, {
        statusCode: HTTP.OK,
        message: 'Applications retrieved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateAppStatus(req, res, next) {
    try {
      const application = await jobService.updateApplicationStatus(
        req.params.organizationId,
        req.params.applicationId,
        req.user.id,
        req.body.status,
        req.body.comment,
      );
      return sendSuccess(res, {
        statusCode: HTTP.OK,
        message: 'Application status updated successfully',
        data: { application },
      });
    } catch (err) {
      next(err);
    }
  },

  async addAppNote(req, res, next) {
    try {
      const application = await jobService.addApplicationNote(
        req.params.organizationId,
        req.params.applicationId,
        req.membership._id,
        req.body.note,
      );
      return sendSuccess(res, {
        statusCode: HTTP.OK,
        message: 'Internal note added successfully',
        data: { application },
      });
    } catch (err) {
      next(err);
    }
  },

  async getMyApplications(req, res, next) {
    try {
      const result = await jobService.getUserApplications(req.user.id, req.query);
      return sendSuccess(res, {
        statusCode: HTTP.OK,
        message: 'My applications retrieved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },
};
