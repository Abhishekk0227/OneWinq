import { Router } from 'express';
import { moderationController } from './moderation.controller.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = Router();

router.use(authenticate);

router.post('/', (req, res, next) => moderationController.submitReport(req, res, next));
router.get('/me', (req, res, next) => moderationController.getMyReports(req, res, next));

export default router;
