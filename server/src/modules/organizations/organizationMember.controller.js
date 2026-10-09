import * as memberService from './organizationMember.service.js';
import { User } from '../users/user.model.js';
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

  async listInvitations(req, res, next) {
    try {
      const result = await memberService.listOrganizationInvitations(
        req.params.organizationId,
        req.query,
      );
      return sendSuccess(res, {
        statusCode: HTTP.OK,
        message: 'Invitations retrieved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  async resendInvitation(req, res, next) {
    try {
      const result = await memberService.resendInvitation(
        req.params.organizationId,
        req.params.invitationId,
        req.user.id,
      );
      return sendSuccess(res, {
        statusCode: HTTP.OK,
        message: 'Invitation resent successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  async revokeInvitation(req, res, next) {
    try {
      const result = await memberService.revokeInvitation(
        req.params.organizationId,
        req.params.invitationId,
      );
      return sendSuccess(res, {
        statusCode: HTTP.OK,
        message: 'Invitation revoked successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  async previewInvitation(req, res, next) {
    try {
      const token = req.query.token || req.params.token;
      const result = await memberService.getInvitationPreview(token);
      return sendSuccess(res, {
        statusCode: HTTP.OK,
        message: 'Invitation preview retrieved successfully',
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

  async acceptInviteWithRegistration(req, res, next) {
    try {
      const result = await memberService.acceptInvitationWithRegistration({
        token: req.body.token,
        displayName: req.body.displayName,
        username: req.body.username,
        password: req.body.password,
        req,
      });
      return sendSuccess(res, {
        statusCode: HTTP.CREATED,
        message: 'Account registered and invitation accepted successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  async getMyInvitations(req, res, next) {
    try {
      const user = await User.findById(req.user.id).select('email').lean();
      if (!user?.email) {
        return sendSuccess(res, {
          statusCode: HTTP.OK,
          message: 'No pending invitations',
          data: { invitations: [] },
        });
      }
      const invitations = await memberService.listMyPendingInvitations(user.email);
      return sendSuccess(res, {
        statusCode: HTTP.OK,
        message: 'Pending invitations retrieved',
        data: { invitations },
      });
    } catch (err) {
      next(err);
    }
  },

  async acceptMyInvitation(req, res, next) {
    try {
      const user = await User.findById(req.user.id).select('email').lean();
      if (!user?.email) {
        return res.status(400).json({ message: 'User email not found' });
      }
      const result = await memberService.acceptMyPendingInvitation(
        req.user.id,
        user.email,
        req.params.invitationId,
      );
      return sendSuccess(res, {
        statusCode: HTTP.OK,
        message: 'Invitation accepted successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  async declineMyInvitation(req, res, next) {
    try {
      const user = await User.findById(req.user.id).select('email').lean();
      if (!user?.email) {
        return res.status(400).json({ message: 'User email not found' });
      }
      const result = await memberService.declineMyPendingInvitation(
        user.email,
        req.params.invitationId,
      );
      return sendSuccess(res, {
        statusCode: HTTP.OK,
        message: 'Invitation declined successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },
};
