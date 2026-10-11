import { Router } from 'express';
import { jobController } from './job.controller.js';
import { authenticate, optionalAuthenticate } from '../../middleware/authenticate.js';
import {
  listJobsQuerySchema,
  applyJobSchema,
  validateBody,
  validateQuery,
} from './job.validation.js';

const router = Router();

// Public / Authenticated: Search and list job postings (attaches hasApplied if logged in)
router.get('/', optionalAuthenticate, validateQuery(listJobsQuerySchema), jobController.listPublicJobs);

// Public / Authenticated: Get job details (attaches hasApplied if logged in)
router.get('/:jobId', optionalAuthenticate, jobController.getPublicJob);

// Authenticated: Apply for a job posting
router.post(
  '/:jobId/apply',
  authenticate,
  validateBody(applyJobSchema),
  jobController.apply,
);

export default router;
