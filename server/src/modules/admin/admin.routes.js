import { Router } from 'express';
import { adminController } from './admin.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireAdmin, requireStaff } from '../../middleware/authorize.js';

const router = Router();

// Protected: requires authentication and staff role (SUPER_ADMIN, ADMIN, or SUPPORT)
router.use(authenticate);
router.use(requireStaff);

router.get('/metrics', (req, res, next) => adminController.getMetrics(req, res, next));
router.get('/users', (req, res, next) => adminController.listUsers(req, res, next));
router.patch('/users/:id/status', (req, res, next) => adminController.updateUserStatus(req, res, next));
router.patch('/users/:id/role', requireAdmin, (req, res, next) => adminController.updateUserRole(req, res, next));
router.post('/batches', requireAdmin, (req, res, next) => adminController.createCardBatch(req, res, next));
router.get('/cards', (req, res, next) => adminController.listCards(req, res, next));
router.get('/cards/stats', (req, res, next) => adminController.getCardStats(req, res, next));
router.post('/cards/generate', requireAdmin, (req, res, next) => adminController.generateCards(req, res, next));
router.get('/cards/:cardCode', (req, res, next) => adminController.getCardDetails(req, res, next));
router.post('/cards/:cardCode/assign', (req, res, next) => adminController.assignCard(req, res, next));
router.post('/cards/:cardCode/unassign', (req, res, next) => adminController.unassignCard(req, res, next));
router.patch('/cards/:cardCode/state', (req, res, next) => adminController.updateCardState(req, res, next));
router.get('/templates', (req, res, next) => adminController.listTemplates(req, res, next));
router.post('/templates', requireAdmin, (req, res, next) => adminController.createTemplate(req, res, next));
router.post('/templates/bulk-lock', requireAdmin, (req, res, next) => adminController.bulkLockTemplates(req, res, next));
router.patch('/templates/:id', requireAdmin, (req, res, next) => adminController.updateTemplate(req, res, next));
router.patch('/templates/:id/lock', requireAdmin, (req, res, next) => adminController.toggleTemplateLock(req, res, next));
router.delete('/templates/:id', requireAdmin, (req, res, next) => adminController.deleteTemplate(req, res, next));
router.get('/audit-logs', requireAdmin, (req, res, next) => adminController.getAuditLogs(req, res, next));

// Moderation
router.get('/reports', (req, res, next) => adminController.listReports(req, res, next));
router.patch('/reports/:id', (req, res, next) => adminController.resolveReport(req, res, next));

// Support Tickets
router.get('/support/tickets', (req, res, next) => adminController.listTickets(req, res, next));
router.patch('/support/tickets/:id', (req, res, next) => adminController.updateTicket(req, res, next));

// Hardware Orders Management
router.get('/orders', (req, res, next) => adminController.listOrders(req, res, next));
router.get('/orders/:id', (req, res, next) => adminController.getOrder(req, res, next));
router.patch('/orders/:id', (req, res, next) => adminController.updateOrder(req, res, next));
router.post('/orders/:id/fulfill', (req, res, next) => adminController.fulfillOrder(req, res, next));

export default router;
