import { Organization } from './organization.model.js';
import { OrganizationMember } from './organizationMember.model.js';
import {
  ORGANIZATION_ROLE,
  ORGANIZATION_MEMBER_STATUS,
  ORGANIZATION_STATUS,
  ERROR_CODE,
  DEFAULT_ROLE_PERMISSIONS,
} from '../../config/constants.js';
import { ConflictError, NotFoundError, ForbiddenError } from '../../shared/errors.js';
import logger from '../../utils/logger.js';

/**
 * Generate a URL-friendly slug from an organization name.
 * @param {string} name
 * @returns {string}
 */
export function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate a unique slug for an organization.
 * @param {string} name
 * @returns {Promise<string>}
 */
export async function generateUniqueSlug(name) {
  let baseSlug = slugify(name);
  if (!baseSlug || baseSlug.length < 2) {
    baseSlug = 'org';
  }

  let slug = baseSlug;
  let counter = 1;

  while (await Organization.exists({ slug })) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return slug;
}

/**
 * Create a new organization and make the creator the OWNER.
 *
 * @param {string} userId - Creator user ID
 * @param {object} input - Validated creation data
 * @returns {Promise<object>} Created organization safe object
 */
export async function createOrganization(userId, input) {
  let slug = input.slug ? slugify(input.slug) : await generateUniqueSlug(input.name);

  if (input.slug) {
    const exists = await Organization.exists({ slug });
    if (exists) {
      throw new ConflictError(
        'An organization with this slug already exists',
        ERROR_CODE.ORGANIZATION_SLUG_TAKEN,
      );
    }
  }

  const organization = await Organization.create({
    ...input,
    slug,
    ownerId: userId,
    status: ORGANIZATION_STATUS.ACTIVE,
    membersCount: 1,
  });

  // Automatically provision the creator as the OWNER member
  await OrganizationMember.create({
    organizationId: organization._id,
    userId,
    role: ORGANIZATION_ROLE.OWNER,
    status: ORGANIZATION_MEMBER_STATUS.ACTIVE,
    permissions: DEFAULT_ROLE_PERMISSIONS.OWNER,
    joinedAt: new Date(),
  });

  logger.info(`[Organization] Created organization "${organization.name}" (${organization.slug}) by user ${userId}`);

  return organization.toSafeObject();
}

/**
 * Retrieve organization by its ObjectId.
 *
 * @param {string} organizationId
 * @returns {Promise<object>}
 */
export async function getOrganizationById(organizationId) {
  const organization = await Organization.findById(organizationId);
  if (!organization) {
    throw new NotFoundError('Organization not found', ERROR_CODE.ORGANIZATION_NOT_FOUND);
  }
  return organization;
}

/**
 * Retrieve public organization by slug.
 *
 * @param {string} slug
 * @returns {Promise<object>}
 */
export async function getOrganizationBySlug(slug) {
  const organization = await Organization.findOne({
    slug: slug.toLowerCase().trim(),
    status: { $ne: ORGANIZATION_STATUS.DEACTIVATED },
  });

  if (!organization) {
    throw new NotFoundError('Organization not found', ERROR_CODE.ORGANIZATION_NOT_FOUND);
  }

  return organization.toSafeObject();
}

/**
 * Update organization profile and settings.
 *
 * @param {string} organizationId
 * @param {object} updateData
 * @returns {Promise<object>}
 */
export async function updateOrganization(organizationId, updateData) {
  const organization = await getOrganizationById(organizationId);

  if (updateData.slug && updateData.slug !== organization.slug) {
    const newSlug = slugify(updateData.slug);
    const existing = await Organization.exists({ slug: newSlug, _id: { $ne: organizationId } });
    if (existing) {
      throw new ConflictError(
        'An organization with this slug already exists',
        ERROR_CODE.ORGANIZATION_SLUG_TAKEN,
      );
    }
    updateData.slug = newSlug;
  }

  Object.assign(organization, updateData);
  await organization.save();

  logger.info(`[Organization] Updated organization "${organization.name}" (${organization._id})`);

  return organization.toSafeObject();
}

/**
 * Get all organizations that a user belongs to with their roles and permissions.
 *
 * @param {string} userId
 * @returns {Promise<Array<object>>}
 */
export async function getUserOrganizations(userId) {
  const memberships = await OrganizationMember.find({
    userId,
    status: ORGANIZATION_MEMBER_STATUS.ACTIVE,
  })
    .populate('organizationId')
    .sort({ createdAt: -1 })
    .lean();

  return memberships
    .filter((m) => m.organizationId && m.organizationId.status !== ORGANIZATION_STATUS.DEACTIVATED)
    .map((m) => {
      const org = m.organizationId;
      const basePermissions = DEFAULT_ROLE_PERMISSIONS[m.role] || [];
      const effectivePermissions = Array.from(new Set([...basePermissions, ...(m.permissions || [])]));

      return {
        membershipId: m._id.toString(),
        role: m.role,
        jobTitle: m.jobTitle,
        employeeId: m.employeeId,
        permissions: effectivePermissions,
        joinedAt: m.joinedAt,
        organization: {
          id: org._id.toString(),
          name: org.name,
          slug: org.slug,
          type: org.type,
          status: org.status,
          tagline: org.tagline,
          logoUrl: org.logoUrl,
          bannerUrl: org.bannerUrl,
          industry: org.industry,
          isVerified: org.isVerified,
          membersCount: org.membersCount,
        },
      };
    });
}

/**
 * Search/list organizations for public discovery.
 *
 * @param {object} query
 * @returns {Promise<object>}
 */
export async function listPublicOrganizations({ page = 1, limit = 20, q, type, industry, isVerified }) {
  const filter = {
    status: ORGANIZATION_STATUS.ACTIVE,
  };

  if (type) {
    filter.type = type;
  }

  if (industry) {
    filter.industry = new RegExp(industry, 'i');
  }

  if (typeof isVerified === 'boolean') {
    filter.isVerified = isVerified;
  }

  if (q && q.trim()) {
    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { tagline: { $regex: escaped, $options: 'i' } },
      { industry: { $regex: escaped, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [total, organizations] = await Promise.all([
    Organization.countDocuments(filter),
    Organization.find(filter)
      .sort({ isVerified: -1, membersCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    organizations: organizations.map((org) => ({
      id: org._id.toString(),
      name: org.name,
      slug: org.slug,
      type: org.type,
      tagline: org.tagline,
      description: org.description,
      logoUrl: org.logoUrl,
      bannerUrl: org.bannerUrl,
      website: org.website,
      industry: org.industry,
      size: org.size,
      location: org.location,
      isVerified: org.isVerified,
      membersCount: org.membersCount,
      jobsCount: org.jobsCount,
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}
