import { OrganizationFollow } from './organizationFollow.model.js';
import { Organization } from './organization.model.js';
import { NotFoundError } from '../../shared/errors.js';

/**
 * Toggle follow/unfollow an organization for an authenticated user.
 *
 * @param {string} userId
 * @param {string} organizationId
 * @returns {Promise<{ isFollowing: boolean, followersCount: number }>}
 */
export async function toggleFollowOrganization(userId, organizationId) {
  const org = await Organization.findById(organizationId);
  if (!org) {
    throw new NotFoundError('Organization not found');
  }

  const existing = await OrganizationFollow.findOne({ organizationId, userId });

  if (existing) {
    await OrganizationFollow.deleteOne({ _id: existing._id });
    const updated = await Organization.findByIdAndUpdate(
      organizationId,
      { $inc: { followersCount: -1 } },
      { new: true }
    );
    const count = Math.max(0, updated?.followersCount || 0);
    if ((updated?.followersCount || 0) < 0) {
      await Organization.findByIdAndUpdate(organizationId, { followersCount: 0 });
    }
    return { isFollowing: false, followersCount: count };
  } else {
    await OrganizationFollow.create({ organizationId, userId });
    const updated = await Organization.findByIdAndUpdate(
      organizationId,
      { $inc: { followersCount: 1 } },
      { new: true }
    );
    return { isFollowing: true, followersCount: updated?.followersCount || 1 };
  }
}

/**
 * Get follow status and follower count for an organization.
 *
 * @param {string|null} userId
 * @param {string} organizationId
 * @returns {Promise<{ isFollowing: boolean, followersCount: number }>}
 */
export async function getFollowStatus(userId, organizationId) {
  const [org, follow] = await Promise.all([
    Organization.findById(organizationId).select('followersCount').lean(),
    userId ? OrganizationFollow.exists({ organizationId, userId }) : false,
  ]);

  if (!org) {
    throw new NotFoundError('Organization not found');
  }

  return {
    isFollowing: Boolean(follow),
    followersCount: org.followersCount || 0,
  };
}

/**
 * Get list of organizations followed by a user.
 *
 * @param {string} userId
 * @param {object} paginationOptions
 * @returns {Promise<object>}
 */
export async function getFollowedOrganizations(userId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const [total, follows] = await Promise.all([
    OrganizationFollow.countDocuments({ userId }),
    OrganizationFollow.find({ userId })
      .populate('organizationId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const organizations = follows
    .filter((f) => f.organizationId)
    .map((f) => {
      const org = f.organizationId;
      return {
        id: org._id.toString(),
        name: org.name,
        slug: org.slug,
        type: org.type,
        logoUrl: org.logoUrl,
        bannerUrl: org.bannerUrl,
        tagline: org.tagline,
        industry: org.industry,
        isVerified: org.isVerified,
        followersCount: org.followersCount || 0,
        membersCount: org.membersCount || 0,
        followedAt: f.createdAt,
      };
    });

  return {
    organizations,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
}
