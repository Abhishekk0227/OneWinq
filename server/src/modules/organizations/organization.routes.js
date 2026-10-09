import { Router } from 'express';
import { organizationController } from './organization.controller.js';
import { organizationMemberController } from './organizationMember.controller.js';
import { departmentController } from '../departments/department.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveOrgContext } from '../../middleware/resolveOrgContext.js';
import { requireOrgPermission } from '../../middleware/requireOrgPermission.js';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  listOrganizationsQuerySchema,
  validateBody,
  validateQuery,
} from './organization.validation.js';
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  validateBody as validateDeptBody,
} from '../departments/department.validation.js';
import { jobController } from '../jobs/job.controller.js';
import {
  createJobSchema,
  updateJobSchema,
  updateApplicationStatusSchema,
  addApplicationNoteSchema,
  validateBody as validateJobBody,
} from '../jobs/job.validation.js';
import { ORGANIZATION_PERMISSION } from '../../config/constants.js';


const router = Router();

// ---- Public & Root Endpoints -----------------------------------------------

// Public: List/search organizations for directory discovery
router.get('/', validateQuery(listOrganizationsQuerySchema), organizationController.list);

// Authenticated: Get organizations the current user belongs to
router.get('/my', authenticate, organizationController.getMyOrganizations);

// Authenticated: Accept invitation to an organization
router.post('/invitations/accept', authenticate, organizationMemberController.acceptInvite);

// Public: Resolve organization by public vanity slug
router.get('/slug/:slug', organizationController.getBySlug);

// Authenticated: Create a new organization
router.post(
  '/',
  authenticate,
  validateBody(createOrganizationSchema),
  organizationController.create,
);

// ---- Tenant-Scoped Organization Management (/:organizationId/*) ------------

// Organization details
router.get(
  '/:organizationId',
  authenticate,
  resolveOrgContext,
  organizationController.getById,
);

router.patch(
  '/:organizationId',
  authenticate,
  resolveOrgContext,
  requireOrgPermission(ORGANIZATION_PERMISSION.ORG_EDIT),
  validateBody(updateOrganizationSchema),
  organizationController.update,
);

// ---- Members & Invitations -------------------------------------------------

router.get(
  '/:organizationId/members',
  authenticate,
  resolveOrgContext,
  requireOrgPermission(ORGANIZATION_PERMISSION.MEMBERS_VIEW),
  organizationMemberController.listMembers,
);

router.post(
  '/:organizationId/invitations',
  authenticate,
  resolveOrgContext,
  requireOrgPermission(ORGANIZATION_PERMISSION.MEMBERS_INVITE),
  organizationMemberController.invite,
);

router.get(
  '/:organizationId/members/:memberId',
  authenticate,
  resolveOrgContext,
  requireOrgPermission(ORGANIZATION_PERMISSION.MEMBERS_VIEW),
  organizationMemberController.getMember,
);

router.patch(
  '/:organizationId/members/:memberId',
  authenticate,
  resolveOrgContext,
  requireOrgPermission(ORGANIZATION_PERMISSION.MEMBERS_EDIT),
  organizationMemberController.updateMember,
);

router.delete(
  '/:organizationId/members/:memberId',
  authenticate,
  resolveOrgContext,
  requireOrgPermission(ORGANIZATION_PERMISSION.MEMBERS_REMOVE),
  organizationMemberController.removeMember,
);

// ---- Departments -----------------------------------------------------------

router.get(
  '/:organizationId/departments',
  authenticate,
  resolveOrgContext,
  departmentController.list,
);

router.post(
  '/:organizationId/departments',
  authenticate,
  resolveOrgContext,
  requireOrgPermission(ORGANIZATION_PERMISSION.DEPARTMENTS_MANAGE),
  validateDeptBody(createDepartmentSchema),
  departmentController.create,
);

router.get(
  '/:organizationId/departments/:departmentId',
  authenticate,
  resolveOrgContext,
  departmentController.getById,
);

router.patch(
  '/:organizationId/departments/:departmentId',
  authenticate,
  resolveOrgContext,
  requireOrgPermission(ORGANIZATION_PERMISSION.DEPARTMENTS_MANAGE),
  validateDeptBody(updateDepartmentSchema),
  departmentController.update,
);

router.delete(
  '/:organizationId/departments/:departmentId',
  authenticate,
  resolveOrgContext,
  requireOrgPermission(ORGANIZATION_PERMISSION.DEPARTMENTS_MANAGE),
  departmentController.delete,
);

// ---- Recruitment & Jobs ----------------------------------------------------

router.get(
  '/:organizationId/jobs',
  authenticate,
  resolveOrgContext,
  requireOrgPermission(ORGANIZATION_PERMISSION.JOBS_VIEW),
  jobController.listOrgJobs,
);

router.post(
  '/:organizationId/jobs',
  authenticate,
  resolveOrgContext,
  requireOrgPermission(ORGANIZATION_PERMISSION.JOBS_CREATE),
  validateJobBody(createJobSchema),
  jobController.create,
);

router.patch(
  '/:organizationId/jobs/:jobId',
  authenticate,
  resolveOrgContext,
  requireOrgPermission(ORGANIZATION_PERMISSION.JOBS_EDIT),
  validateJobBody(updateJobSchema),
  jobController.update,
);

router.delete(
  '/:organizationId/jobs/:jobId',
  authenticate,
  resolveOrgContext,
  requireOrgPermission(ORGANIZATION_PERMISSION.JOBS_DELETE),
  jobController.delete,
);

// ---- Applications & Candidate Pipeline -------------------------------------

router.get(
  '/:organizationId/applications',
  authenticate,
  resolveOrgContext,
  requireOrgPermission(ORGANIZATION_PERMISSION.APPLICATIONS_VIEW),
  jobController.listApplications,
);

router.get(
  '/:organizationId/jobs/:jobId/applications',
  authenticate,
  resolveOrgContext,
  requireOrgPermission(ORGANIZATION_PERMISSION.APPLICATIONS_VIEW),
  jobController.listApplications,
);

router.patch(
  '/:organizationId/applications/:applicationId/status',
  authenticate,
  resolveOrgContext,
  requireOrgPermission(ORGANIZATION_PERMISSION.APPLICATIONS_MANAGE),
  validateJobBody(updateApplicationStatusSchema),
  jobController.updateAppStatus,
);

router.post(
  '/:organizationId/applications/:applicationId/notes',
  authenticate,
  resolveOrgContext,
  requireOrgPermission(ORGANIZATION_PERMISSION.APPLICATIONS_MANAGE),
  validateJobBody(addApplicationNoteSchema),
  jobController.addAppNote,
);

// ---- Organization Audit Logs -----------------------------------------------

router.get(
  '/:organizationId/audit-logs',
  authenticate,
  resolveOrgContext,
  requireOrgPermission(ORGANIZATION_PERMISSION.AUDIT_VIEW),
  async (req, res, next) => {
    try {
      const { listOrgAuditLogs } = await import('./organizationAuditLog.service.js');
      const result = await listOrgAuditLogs(req.params.organizationId, req.query);
      return res.status(200).json({
        success: true,
        message: 'Audit logs retrieved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;


