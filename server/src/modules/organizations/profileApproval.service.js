import { ProfileApproval } from './profileApproval.model.js';
import { OrganizationMember } from './organizationMember.model.js';
import { Organization } from './organization.model.js';
import { calculateObjectDiff } from '../../utils/objectDiff.util.js';
import { calculateProfileCompletionScore } from './profileScore.util.js';
import { recordOrgAudit } from './organizationAuditLog.service.js';
import { PROFILE_APPROVAL_STATUS } from '../../config/constants.js';
import { NotFoundError, BadRequestError } from '../../shared/errors.js';

export async function submitDraftProfile(organizationId, memberId, userId, draftProfileData) {
  const member = await OrganizationMember.findOne({ _id: memberId, organizationId });
  if (!member) {
    throw new NotFoundError('Organization member not found');
  }

  // Check organization governance policy
  const org = await Organization.findById(organizationId);
  const requiresApproval = org?.settings?.requireApprovalForProfileChanges ?? true;

  if (!requiresApproval) {
    // Immediate publishing without moderation queue
    member.publishedProfile = draftProfileData;
    member.draftProfile = draftProfileData;
    member.approvalStatus = PROFILE_APPROVAL_STATUS.APPROVED;
    member.isLocked = false;
    member.profileCompletionScore = calculateProfileCompletionScore(draftProfileData);
    await member.save();

    await recordOrgAudit(organizationId, userId, {
      action: 'PROFILE_UPDATED_DIRECT',
      targetType: 'OrganizationMember',
      targetId: member._id.toString(),
      details: { memberId: member._id.toString() },
    });

    return { autoApproved: true, member: member.toSafeObject() };
  }

  // Calculate deep diff between live published profile and the new draft
  const diffSummary = calculateObjectDiff(member.publishedProfile || {}, draftProfileData || {});

  // Update member state: draft stored, draft locked pending review
  member.draftProfile = draftProfileData;
  member.approvalStatus = PROFILE_APPROVAL_STATUS.PENDING_REVIEW;
  member.isLocked = true;
  await member.save();

  // Create approval record
  const approval = await ProfileApproval.create({
    organizationId,
    memberId: member._id,
    userId: member.userId,
    submittedBy: userId,
    status: PROFILE_APPROVAL_STATUS.PENDING_REVIEW,
    diffSummary,
    draftSnapshot: draftProfileData,
  });

  await recordOrgAudit(organizationId, userId, {
    action: 'PROFILE_APPROVAL_SUBMITTED',
    targetType: 'ProfileApproval',
    targetId: approval._id.toString(),
    details: { memberId: member._id.toString(), diffCount: diffSummary.length },
  });

  return approval;
}

export async function listApprovals(organizationId, { status, page = 1, limit = 20 } = {}) {
  const filter = { organizationId };
  if (status && status !== 'ALL') {
    filter.status = status;
  }

  const skip = (page - 1) * limit;

  const [total, approvals] = await Promise.all([
    ProfileApproval.countDocuments(filter),
    ProfileApproval.find(filter)
      .populate('userId', 'displayName username email avatarUrl')
      .populate('submittedBy', 'displayName username email')
      .populate('reviewerId', 'displayName username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    approvals: approvals.map((a) => ({
      id: a._id.toString(),
      memberId: a.memberId.toString(),
      user: a.userId
        ? {
            id: a.userId._id.toString(),
            displayName: a.userId.displayName,
            username: a.userId.username,
            email: a.userId.email,
            avatarUrl: a.userId.avatarUrl,
          }
        : null,
      submittedBy: a.submittedBy
        ? {
            id: a.submittedBy._id.toString(),
            displayName: a.submittedBy.displayName,
          }
        : null,
      status: a.status,
      diffSummary: a.diffSummary || [],
      draftSnapshot: a.draftSnapshot,
      reviewer: a.reviewerId
        ? {
            id: a.reviewerId._id.toString(),
            displayName: a.reviewerId.displayName,
          }
        : null,
      reviewNote: a.reviewNote || '',
      reviewedAt: a.reviewedAt,
      createdAt: a.createdAt,
    })),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

export async function reviewApproval(organizationId, approvalId, reviewerUserId, { action, reviewNote = '' }) {
  const approval = await ProfileApproval.findOne({ _id: approvalId, organizationId });
  if (!approval) {
    throw new NotFoundError('Approval request not found');
  }

  const member = await OrganizationMember.findOne({ _id: approval.memberId, organizationId });
  if (!member) {
    throw new NotFoundError('Associated organization member not found');
  }

  if (action === 'APPROVE') {
    // 1. Copy draft to published
    member.publishedProfile = approval.draftSnapshot;
    member.approvalStatus = PROFILE_APPROVAL_STATUS.APPROVED;
    member.isLocked = false;

    // 2. Recalculate completion score
    member.profileCompletionScore = calculateProfileCompletionScore({
      ...approval.draftSnapshot,
      jobTitle: member.jobTitle,
      departmentId: member.departmentId,
    });
    await member.save();

    approval.status = PROFILE_APPROVAL_STATUS.APPROVED;
  } else if (action === 'REJECT') {
    member.approvalStatus = PROFILE_APPROVAL_STATUS.REJECTED;
    member.isLocked = false;
    await member.save();

    approval.status = PROFILE_APPROVAL_STATUS.REJECTED;
  } else if (action === 'REQUEST_CHANGES') {
    member.approvalStatus = PROFILE_APPROVAL_STATUS.CHANGES_REQUESTED;
    member.isLocked = false;
    await member.save();

    approval.status = PROFILE_APPROVAL_STATUS.CHANGES_REQUESTED;
  } else {
    throw new BadRequestError('Invalid review action. Must be APPROVE, REJECT, or REQUEST_CHANGES');
  }

  approval.reviewerId = reviewerUserId;
  approval.reviewNote = reviewNote;
  approval.reviewedAt = new Date();
  await approval.save();

  await recordOrgAudit(organizationId, reviewerUserId, {
    action: `PROFILE_APPROVAL_${approval.status}`,
    targetType: 'ProfileApproval',
    targetId: approval._id.toString(),
    details: { memberId: member._id.toString(), action, reviewNote },
  });

  return { approval, member: member.toSafeObject() };
}
