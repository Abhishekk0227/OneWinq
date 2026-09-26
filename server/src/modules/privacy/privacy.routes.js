import { Router } from 'express';
import { privacyController } from './privacy.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { privacyRateLimiter } from '../../middleware/rateLimiter.js';

const router = Router();

router.use(authenticate);

router.post('/export', privacyRateLimiter, (req, res, next) => privacyController.requestExport(req, res, next));
router.get('/export/latest', (req, res, next) => privacyController.getLatestExport(req, res, next));
router.get('/export/download/:userId', (req, res, next) => privacyController.downloadExport(req, res, next));
router.post('/delete-account', privacyRateLimiter, (req, res, next) => privacyController.deleteAccount(req, res, next));
router.post('/restore-account', privacyRateLimiter, (req, res, next) => privacyController.restoreAccount(req, res, next));
router.post('/deactivate', privacyRateLimiter, (req, res, next) => privacyController.deactivateAccount(req, res, next));
router.post('/reactivate', privacyRateLimiter, (req, res, next) => privacyController.reactivateAccount(req, res, next));

export default router;

