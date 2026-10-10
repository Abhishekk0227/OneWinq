import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../../helpers/db.js';
import { generateAccessToken } from '../../../src/modules/auth/tokenService.js';
import { hashPassword } from '../../../src/modules/auth/passwordService.js';
import { User } from '../../../src/modules/users/user.model.js';
import { Organization } from '../../../src/modules/organizations/organization.model.js';
import { OrganizationMember } from '../../../src/modules/organizations/organizationMember.model.js';
import { OrganizationRole } from '../../../src/modules/organizations/organizationRole.model.js';
import {
  ACCOUNT_STATE,
  ORGANIZATION_TYPE,
  ORGANIZATION_ROLE,
  ORGANIZATION_PERMISSION,
  DEFAULT_ROLE_PERMISSIONS,
  JOB_STATUS,
  EMPLOYMENT_TYPE,
  WORKPLACE_TYPE,
  APPLICATION_STATUS,
} from '../../../src/config/constants.js';
import logger from '../../../src/utils/logger.js';

let app;
let mongoose;

beforeAll(async () => {
  const appModule = await import('../../../app.js');
  app = appModule.default;

  try {
    mongoose = await connectTestDb();
  } catch (err) {
    logger.warn('Failed to connect test db in organizations.test.js', { error: err.message });
  }
});

afterEach(async () => {
  await clearTestDb();
});

afterAll(async () => {
  await disconnectTestDb();
});

function skipIfNoDb() {
  return !mongoose || mongoose.connection.readyState !== 1;
}

describe('Unified Platform Organizations & Recruitment Integration', () => {
  let ownerUser;
  let memberUser;
  let candidateUser;
  let ownerToken;
  let memberToken;
  let candidateToken;

  beforeEach(async () => {
    if (skipIfNoDb()) return;

    // Seed Default Roles if needed
    for (const [roleName, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      await OrganizationRole.findOneAndUpdate(
        { organizationId: null, name: roleName },
        {
          organizationId: null,
          name: roleName,
          displayName: roleName,
          permissions,
          isSystem: true,
        },
        { upsert: true }
      );
    }

    const passwordHash = await hashPassword('Password123!');

    ownerUser = await User.create({
      displayName: 'Alice Founder',
      username: 'alicefounder',
      email: 'alice@founder.com',
      passwordHash,
      accountState: ACCOUNT_STATE.ACTIVE,
      isEmailVerified: true,
    });

    memberUser = await User.create({
      displayName: 'Bob Member',
      username: 'bobmember',
      email: 'bob@member.com',
      passwordHash,
      accountState: ACCOUNT_STATE.ACTIVE,
      isEmailVerified: true,
    });

    candidateUser = await User.create({
      displayName: 'Charlie Candidate',
      username: 'charliecandidate',
      email: 'charlie@candidate.com',
      passwordHash,
      accountState: ACCOUNT_STATE.ACTIVE,
      isEmailVerified: true,
    });

    ownerToken = generateAccessToken({
      userId: ownerUser._id.toString(),
      role: ownerUser.role,
      tokenVersion: ownerUser.tokenVersion,
    });

    memberToken = generateAccessToken({
      userId: memberUser._id.toString(),
      role: memberUser.role,
      tokenVersion: memberUser.tokenVersion,
    });

    candidateToken = generateAccessToken({
      userId: candidateUser._id.toString(),
      role: candidateUser.role,
      tokenVersion: candidateUser.tokenVersion,
    });
  });

  it('allows user to create an organization and automatically becomes OWNER member', async () => {
    if (skipIfNoDb()) return;

    const res = await request(app)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Acme Robotics Corp',
        slug: 'acme-robotics',
        type: ORGANIZATION_TYPE.COMPANY,
        industry: 'Robotics',
        website: 'https://acme.org',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.organization.name).toBe('Acme Robotics Corp');
    expect(res.body.data.organization.slug).toBe('acme-robotics');

    const orgId = res.body.data.organization.id;

    // Verify membership
    const membership = await OrganizationMember.findOne({
      organizationId: orgId,
      userId: ownerUser._id,
    });
    expect(membership).toBeTruthy();
    expect(membership.role).toBe(ORGANIZATION_ROLE.OWNER);

    // List user organizations
    const myOrgsRes = await request(app)
      .get('/api/v1/organizations/my')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(myOrgsRes.status).toBe(200);
    expect(myOrgsRes.body.data.organizations).toHaveLength(1);
    expect(myOrgsRes.body.data.organizations[0].role).toBe(ORGANIZATION_ROLE.OWNER);
  });

  it('supports department creation and job posting lifecycle', async () => {
    if (skipIfNoDb()) return;

    // 1. Create Org
    const orgRes = await request(app)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Nexus Dynamics',
        slug: 'nexus-dynamics',
        type: ORGANIZATION_TYPE.STARTUP,
      });

    const orgId = orgRes.body.data.organization.id;

    // 2. Create Department
    const deptRes = await request(app)
      .post(`/api/v1/organizations/${orgId}/departments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Engineering',
        code: 'ENG',
        description: 'Core software engineering',
      });

    expect(deptRes.status).toBe(201);
    expect(deptRes.body.data.department.name).toBe('Engineering');
    const deptId = deptRes.body.data.department.id;

    // 3. Post a Job Vacancy
    const jobRes = await request(app)
      .post(`/api/v1/organizations/${orgId}/jobs`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Full Stack Engineer',
        departmentId: deptId,
        employmentType: EMPLOYMENT_TYPE.FULL_TIME,
        workplaceType: WORKPLACE_TYPE.REMOTE,
        skills: ['TypeScript', 'Node.js', 'React'],
        description: 'Build cutting edge multi-tenant products for high scale users.',
        status: JOB_STATUS.PUBLISHED,
      });

    expect(jobRes.status).toBe(201);
    expect(jobRes.body.data.job.title).toBe('Full Stack Engineer');
    const jobId = jobRes.body.data.job.id;

    // 4. Candidate applies for the job
    const applyRes = await request(app)
      .post(`/api/v1/jobs/${jobId}/apply`)
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({
        resumeUrl: 'https://example.com/charlie-resume.pdf',
        coverLetter: 'I am excited to build high-scale applications with Nexus Dynamics.',
      });

    expect(applyRes.status).toBe(201);
    expect(applyRes.body.success).toBe(true);
    const applicationId = applyRes.body.data.application.id;

    // 5. Candidate checks their submitted applications
    const myAppsRes = await request(app)
      .get('/api/v1/me/applications')
      .set('Authorization', `Bearer ${candidateToken}`);

    expect(myAppsRes.status).toBe(200);
    expect(myAppsRes.body.data.applications).toHaveLength(1);
    expect(myAppsRes.body.data.applications[0].jobTitle).toBe('Full Stack Engineer');

    // 6. Organization reviews candidate and advances status to INTERVIEW
    const updateStatusRes = await request(app)
      .patch(`/api/v1/organizations/${orgId}/applications/${applicationId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        status: APPLICATION_STATUS.INTERVIEW,
        comment: 'Strong technical profile, scheduled for round 1.',
      });

    expect(updateStatusRes.status).toBe(200);
    expect(updateStatusRes.body.data.application.status).toBe(APPLICATION_STATUS.INTERVIEW);

    // 7. Verify Audit Log was recorded
    const auditRes = await request(app)
      .get(`/api/v1/organizations/${orgId}/audit-logs`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data.logs.length).toBeGreaterThan(0);
  });

  it('allows owner/admin to create and list custom organization roles', async () => {
    if (skipIfNoDb()) return;

    // 1. Create Organization
    const orgRes = await request(app)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Apex Academy',
        slug: 'apex-academy',
        type: ORGANIZATION_TYPE.COLLEGE,
      });

    expect(orgRes.status).toBe(201);
    const orgId = orgRes.body.data.organization.id;

    // 2. Create custom role
    const createRoleRes = await request(app)
      .post(`/api/v1/organizations/${orgId}/roles`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'DEAN_ACADEMICS',
        displayName: 'Dean of Academics',
        description: 'Oversees faculty courses and student events.',
        permissions: [ORGANIZATION_PERMISSION.EVENTS_VIEW, ORGANIZATION_PERMISSION.EVENTS_MANAGE],
      });

    expect(createRoleRes.status).toBe(201);
    expect(createRoleRes.body.success).toBe(true);
    expect(createRoleRes.body.data.role.name).toBe('DEAN_ACADEMICS');
    expect(createRoleRes.body.data.role.displayName).toBe('Dean of Academics');

    // 3. List roles
    const listRolesRes = await request(app)
      .get(`/api/v1/organizations/${orgId}/roles`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(listRolesRes.status).toBe(200);
    const roleNames = listRolesRes.body.data.roles.map((r) => r.name);
    expect(roleNames).toContain('DEAN_ACADEMICS');
    expect(roleNames).toContain('OWNER');
    expect(roleNames).toContain('ADMIN');
  });
});
