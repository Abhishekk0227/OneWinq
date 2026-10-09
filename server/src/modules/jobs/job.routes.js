import { Router } from 'express';
import { jobController } from './job.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import {
  listJobsQuerySchema,
  applyJobSchema,
  validateBody,
  validateQuery,
} from './job.validation.js';

const router = Router();

// Public: Search and list job postings
router.get('/', validateQuery(listJobsQuerySchema), jobController.listPublicJobs);

// Public: Get job details
router.get('/:jobId', jobController.getPublicJob);

// Authenticated: Apply for a job posting
router.post(
  '/:jobId/apply',
  authenticate,
  validateBody(applyJobSchema),
  jobController.apply,
);

export default router;
