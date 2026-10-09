import { Organization } from '../src/modules/organizations/organization.model.js';
import { OrganizationMember } from '../src/modules/organizations/organizationMember.model.js';
import { OrganizationRole } from '../src/modules/organizations/organizationRole.model.js';
import { Department } from '../src/modules/departments/department.model.js';
import { Job } from '../src/modules/jobs/job.model.js';
import { Application } from '../src/modules/jobs/application.model.js';
import { ORGANIZATION_ROLE, DEFAULT_ROLE_PERMISSIONS } from '../src/config/constants.js';
import logger from '../src/utils/logger.js';

export const name = '003_create_organizations';

export async function up() {
  logger.info(`[Migration:${name}] Syncing organization indexes...`);

  const models = [
    Organization,
    OrganizationMember,
    OrganizationRole,
    Department,
    Job,
    Application,
  ];

  for (const model of models) {
    try {
      await model.syncIndexes();
      logger.info(`[Migration:${name}] Synced indexes for ${model.modelName}`);
    } catch (err) {
      logger.error(`[Migration:${name}] Failed syncing indexes for ${model.modelName}`, {
        error: err.message,
      });
      throw err;
    }
  }

  // Seed default system-wide role templates
  const defaultRoles = [
    {
      organizationId: null,
      name: ORGANIZATION_ROLE.OWNER,
      displayName: 'Owner',
      description: 'Full administrative ownership and billing access',
      permissions: DEFAULT_ROLE_PERMISSIONS.OWNER,
      isSystem: true,
    },
    {
      organizationId: null,
      name: ORGANIZATION_ROLE.ADMIN,
      displayName: 'Admin',
      description: 'Full management of members, jobs, cards, and organization settings',
      permissions: DEFAULT_ROLE_PERMISSIONS.ADMIN,
      isSystem: true,
    },
    {
      organizationId: null,
      name: ORGANIZATION_ROLE.HR_MANAGER,
      displayName: 'HR Manager',
      description: 'Manage recruitment, job postings, and candidate applications',
      permissions: DEFAULT_ROLE_PERMISSIONS.HR_MANAGER,
      isSystem: true,
    },
    {
      organizationId: null,
      name: ORGANIZATION_ROLE.MANAGER,
      displayName: 'Manager',
      description: 'View members, manage department jobs and events',
      permissions: DEFAULT_ROLE_PERMISSIONS.MANAGER,
      isSystem: true,
    },
    {
      organizationId: null,
      name: ORGANIZATION_ROLE.MEMBER,
      displayName: 'Member',
      description: 'Standard organization member access',
      permissions: DEFAULT_ROLE_PERMISSIONS.MEMBER,
      isSystem: true,
    },
  ];

  for (const roleData of defaultRoles) {
    await OrganizationRole.findOneAndUpdate(
      { organizationId: null, name: roleData.name },
      { $set: roleData },
      { upsert: true, new: true },
    );
  }

  logger.info(`[Migration:${name}] Seeded default organization system roles.`);
}

export async function down() {
  logger.info(`[Migration:${name}] Rollback placeholder`);
}
