import * as approvalService from './profileApproval.service.js';

export const profileApprovalController = {
  submit: async (req, res, next) => {
    try {
      const approval = await approvalService.submitDraftProfile(
        req.params.organizationId,
        req.body.memberId,
        req.user.id,
        req.body.draftProfile
      );
      return res.status(201).json({
        success: true,
        message: 'Profile draft submitted for organization review',
        data: { approval },
      });
    } catch (err) {
      next(err);
    }
  },

  list: async (req, res, next) => {
    try {
      const result = await approvalService.listApprovals(
        req.params.organizationId,
        req.query
      );
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  review: async (req, res, next) => {
    try {
      const result = await approvalService.reviewApproval(
        req.params.organizationId,
        req.params.approvalId,
        req.user.id,
        req.body
      );
      return res.status(200).json({
        success: true,
        message: `Profile draft ${req.body.action.toLowerCase()}d successfully`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },
};
