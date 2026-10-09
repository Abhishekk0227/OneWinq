import { OrganizationRole } from './organizationRole.model.js';
import { OrganizationMember } from './organizationMember.model.js';
import { DEFAULT_ROLE_PERMISSIONS, ORGANIZATION_ROLE } from '../../config/constants.js';
import { BadRequestError, NotFoundError, ConflictError } from '../../shared/errors.js';

/**
 * List all available roles for an organization (system roles + custom roles).
 */
export async function listRoles(organizationId) {
  // Find custom roles for this organization
  const customRoles = await OrganizationRole.find({ organizationId }).sort({ createdAt: 1 }).lean();

  // Standard system roles list
  const systemRoles = [
    {
      name: ORGANIZATION_ROLE.OWNER,
      displayName: 'Organization Owner',
      description: 'Full administrative access and ownership governance.',
      permissions: DEFAULT_ROLE_PERMISSIONS.OWNER,
      isSystem: true,
    },
    {
      name: ORGANIZATION_ROLE.ADMIN,
      displayName: 'Administrator',
      description: 'Full workspace management across team, departments, events, and settings.',
      permissions: DEFAULT_ROLE_PERMISSIONS.ADMIN,
      isSystem: true,
    },
    {
      name: ORGANIZATION_ROLE.HR_MANAGER,
      displayName: 'HR & People Operations',
      description: 'Manage members, job postings, applications, and profile approvals.',
      permissions: DEFAULT_ROLE_PERMISSIONS.HR_MANAGER,
      isSystem: true,
    },
    {
      name: ORGANIZATION_ROLE.MANAGER,
      displayName: 'Department / Team Lead',
      description: 'Team lead with job vacancies, events, and candidate review capabilities.',
      permissions: DEFAULT_ROLE_PERMISSIONS.MANAGER,
      isSystem: true,
    },
    {
      name: ORGANIZATION_ROLE.MEMBER,
      displayName: 'Staff / Faculty / Member',
      description: 'Standard member portal access with personal card and events calendar.',
      permissions: DEFAULT_ROLE_PERMISSIONS.MEMBER,
      isSystem: true,
    },
  ];

  return [...systemRoles, ...customRoles];
}

/**
 * Create a custom organizational role.
 */
export async function createRole(organizationId, { name, displayName, description, permissions }) {
  const normalizedName = name.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');

  // Check if system role name conflicts
  if (Object.values(ORGANIZATION_ROLE).includes(normalizedName)) {
    throw new ConflictError(`Cannot create role with reserved system name "${normalizedName}"`);
  }

  // Check if role name already exists in this organization
  const existing = await OrganizationRole.findOne({ organizationId, name: normalizedName });
  if (existing) {
    throw new ConflictError(`A custom role named "${normalizedName}" already exists in this organization`);
  }

  const role = await OrganizationRole.create({
    organizationId,
    name: normalizedName,
    displayName: displayName.trim(),
    description: (description || '').trim(),
    permissions: Array.isArray(permissions) ? permissions : [],
    isSystem: false,
  });

  return role;
}

/**
 * Update an existing custom organizational role.
 */
export async function updateRole(organizationId, roleId, { displayName, description, permissions }) {
  const role = await OrganizationRole.findOne({ _id: roleId, organizationId });
  if (!role) {
    throw new NotFoundError('Custom role not found');
  }

  if (role.isSystem) {
    throw new BadRequestError('Cannot modify system-default roles');
  }

  if (displayName) role.displayName = displayName.trim();
  if (description !== undefined) role.description = description.trim();
  if (permissions !== undefined && Array.isArray(permissions)) {
    role.permissions = permissions;
  }

  await role.save();
  return role;
}

/**
 * Delete a custom organizational role.
 */
export async function deleteRole(organizationId, roleId) {
  const role = await OrganizationRole.findOne({ _id: roleId, organizationId });
  if (!role) {
    throw new NotFoundError('Custom role not found');
  }

  if (role.isSystem) {
    throw new BadRequestError('Cannot delete system-default roles');
  }

  // Check if any member is assigned this role
  const membersWithRole = await OrganizationMember.countDocuments({
    organizationId,
    role: role.name,
  });

  if (membersWithRole > 0) {
    throw new BadRequestError(
      `Cannot delete role "${role.displayName}". It is currently assigned to ${membersWithRole} member(s).`,
    );
  }

  await OrganizationRole.deleteOne({ _id: roleId });
  return { deleted: true, roleId };
}
