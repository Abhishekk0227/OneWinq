import { Router } from 'express';
import { supportController } from './support.controller.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = Router();

router.use(authenticate);

router.post('/tickets', (req, res, next) => supportController.createTicket(req, res, next));
router.get('/tickets', (req, res, next) => supportController.listTickets(req, res, next));
router.get('/tickets/:id', (req, res, next) => supportController.getTicket(req, res, next));
router.post('/tickets/:id/reply', (req, res, next) => supportController.replyTicket(req, res, next));
router.post('/tickets/:id/close', (req, res, next) => supportController.closeTicket(req, res, next));

export default router;
