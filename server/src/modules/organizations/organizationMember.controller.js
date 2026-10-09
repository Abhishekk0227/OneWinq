import * as memberService from './organizationMember.service.js';
import { sendSuccess } from '../../shared/response.js';
import { HTTP } from '../../config/constants.js';

export const organizationMemberController = {
  async listMembers(req, res, next) {
    try {
      const result = await memberService.listOrganizationMembers(
        req.params.organizationId,
        req.query,
      );
      return sendSuccess(res, {
        statusCode: HTTP.OK,
        message: 'Members retrieved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  async getMember(req, res, next) {
    try {
      const member = await memberService.getOrganizationMember(
        req.params.organizationId,
        req.params.memberId,
      );
      return sendSuccess(res, {
        statusCode: HTTP.OK,
        message: 'Member retrieved successfully',
        data: { member: member.toSafeObject() },
      });
    } catch (err) {
      next(err);
    }
  },

  async updateMember(req, res, next) {
    try {
      const member = await memberService.updateOrganizationMember(
        req.params.organizationId,
        req.params.memberId,
        req.body,
      );
      return sendSuccess(res, {
        statusCode: HTTP.OK,
        message: 'Member updated successfully',
        data: { member },
      });
    } catch (err) {
      next(err);
    }
  },

  async removeMember(req, res, next) {
    try {
      const result = await memberService.removeOrganizationMember(
        req.params.organizationId,
        req.params.memberId,
      );
      return sendSuccess(res, {
        statusCode: HTTP.OK,
        message: 'Member removed successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  async invite(req, res, next) {
    try {
      const result = await memberService.inviteMember(
        req.params.organizationId,
        req.user.id,
        req.body,
      );
      return sendSuccess(res, {
        statusCode: HTTP.CREATED,
        message: 'Invitation sent successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  async acceptInvite(req, res, next) {
    try {
      const member = await memberService.acceptInvitation(req.user.id, req.body.token);
      return sendSuccess(res, {
        statusCode: HTTP.OK,
        message: 'Invitation accepted successfully',
        data: { member },
      });
    } catch (err) {
      next(err);
    }
  },
};
