import { adminService } from './admin.service.js';
import {
  updateUserStatusSchema,
  updateUserRoleSchema,
  createCardBatchSchema,
  adminUserQuerySchema,
  generateCardsSchema,
  assignCardSchema,
  updateCardStateAdminSchema,
  adminOrderQuerySchema,
  updateOrderAdminSchema,
  fulfillOrderAdminSchema,
  toggleTemplateLockSchema,
  bulkLockTemplatesSchema,
} from './admin.validation.js';
import { profileTemplateService } from '../profiles/profileTemplate.service.js';
import { adminTemplateSchema } from '../profiles/profile.validation.js';
import { sendSuccess } from '../../shared/response.js';
import { HTTP } from '../../config/constants.js';

export class AdminController {
  /**
   * GET /api/v1/admin/metrics
   */
  async getMetrics(req, res, next) {
    try {
      const metrics = await adminService.getSystemMetrics();
      return sendSuccess(res, HTTP.OK, 'System metrics retrieved', { metrics });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * GET /api/v1/admin/users
   */
  async listUsers(req, res, next) {
    try {
      const query = adminUserQuerySchema.parse(req.query);
      const data = await adminService.listUsers(query);
      return sendSuccess(res, HTTP.OK, 'Users retrieved successfully', data);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * PATCH /api/v1/admin/users/:id/status
   */
  async updateUserStatus(req, res, next) {
    try {
      const parsed = updateUserStatusSchema.parse(req.body);
      const user = await adminService.updateUserStatus(
        req.user.id,
        req.params.id,
        parsed,
        { ip: req.ip, userAgent: req.get('user-agent') }
      );
      return sendSuccess(res, HTTP.OK, 'User status updated successfully', { user });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * PATCH /api/v1/admin/users/:id/role
   */
  async updateUserRole(req, res, next) {
    try {
      const parsed = updateUserRoleSchema.parse(req.body);
      const user = await adminService.updateUserRole(
        req.user.id,
        req.params.id,
        parsed,
        { ip: req.ip, userAgent: req.get('user-agent') }
      );
      return sendSuccess(res, HTTP.OK, 'User role updated successfully', { user });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * POST /api/v1/admin/batches
   */
  async createCardBatch(req, res, next) {
    try {
      const parsed = createCardBatchSchema.parse(req.body);
      const result = await adminService.createHardwareBatch(
        req.user.id,
        parsed,
        { ip: req.ip, userAgent: req.get('user-agent') }
      );
      return sendSuccess(res, HTTP.CREATED, 'Card batch created successfully', result);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * GET /api/v1/admin/audit-logs
   */
  async getAuditLogs(req, res, next) {
    try {
      const data = await adminService.getAuditLogs(req.query);
      return sendSuccess(res, HTTP.OK, 'Audit logs retrieved successfully', data);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * GET /api/v1/admin/reports
   */
  async listReports(req, res, next) {
    try {
      const data = await adminService.listReports(req.query);
      return sendSuccess(res, HTTP.OK, 'Abuse reports retrieved successfully', data);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * PATCH /api/v1/admin/reports/:id
   */
  async resolveReport(req, res, next) {
    try {
      const report = await adminService.resolveReport(req.user.id, req.params.id, req.body);
      return sendSuccess(res, HTTP.OK, 'Report resolved successfully', { report });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * GET /api/v1/admin/support/tickets
   */
  async listTickets(req, res, next) {
    try {
      const data = await adminService.listTickets(req.query);
      return sendSuccess(res, HTTP.OK, 'Support tickets retrieved successfully', data);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * PATCH /api/v1/admin/support/tickets/:id
   */
  async updateTicket(req, res, next) {
    try {
      const ticket = await adminService.updateTicket(req.user.id, req.params.id, req.body);
      return sendSuccess(res, HTTP.OK, 'Support ticket updated successfully', { ticket });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * GET /api/v1/admin/cards/stats
   */
  async getCardStats(req, res, next) {
    try {
      const stats = await adminService.getCardStats();
      return sendSuccess(res, HTTP.OK, 'Card statistics retrieved successfully', { stats });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * GET /api/v1/admin/cards
   */
  async listCards(req, res, next) {
    try {
      const data = await adminService.listCards(req.query);
      return sendSuccess(res, HTTP.OK, 'Cards retrieved successfully', data);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * POST /api/v1/admin/cards/generate
   */
  async generateCards(req, res, next) {
    try {
      const parsed = generateCardsSchema.parse(req.body);
      const result = await adminService.generateCards(
        req.user.id,
        parsed,
        { ip: req.ip, userAgent: req.get('user-agent') }
      );
      return sendSuccess(res, HTTP.CREATED, 'Cards generated successfully', result);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * GET /api/v1/admin/cards/:cardCode
   */
  async getCardDetails(req, res, next) {
    try {
      const data = await adminService.getCardDetails(req.params.cardCode);
      return sendSuccess(res, HTTP.OK, 'Card details retrieved successfully', data);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * POST /api/v1/admin/cards/:cardCode/assign
   */
  async assignCard(req, res, next) {
    try {
      const parsed = assignCardSchema.parse(req.body);
      const data = await adminService.assignCard(
        req.user.id,
        req.params.cardCode,
        parsed,
        { ip: req.ip, userAgent: req.get('user-agent') }
      );
      return sendSuccess(res, HTTP.OK, 'Card assigned successfully', data);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * POST /api/v1/admin/cards/:cardCode/unassign
   */
  async unassignCard(req, res, next) {
    try {
      const data = await adminService.unassignCard(
        req.user.id,
        req.params.cardCode,
        { ip: req.ip, userAgent: req.get('user-agent') }
      );
      return sendSuccess(res, HTTP.OK, 'Card unassigned successfully', data);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * PATCH /api/v1/admin/cards/:cardCode/state
   */
  async updateCardState(req, res, next) {
    try {
      const parsed = updateCardStateAdminSchema.parse(req.body);
      const data = await adminService.updateCardState(
        req.user.id,
        req.params.cardCode,
        parsed,
        { ip: req.ip, userAgent: req.get('user-agent') }
      );
      return sendSuccess(res, HTTP.OK, 'Card state updated successfully', data);
    } catch (err) {
      return next(err);
    }
  }



  /**
   * GET /api/v1/admin/templates
   */
  async listTemplates(req, res, next) {
    try {
      const templates = await profileTemplateService.adminListTemplates();
      return sendSuccess(res, HTTP.OK, 'Templates retrieved successfully', { templates });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * POST /api/v1/admin/templates
   */
  async createTemplate(req, res, next) {
    try {
      const validated = adminTemplateSchema.parse(req.body);
      const template = await profileTemplateService.adminCreateTemplate(validated);
      return sendSuccess(res, HTTP.CREATED, 'Template created successfully', { template });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * PATCH /api/v1/admin/templates/:id
   */
  async updateTemplate(req, res, next) {
    try {
      const template = await profileTemplateService.adminUpdateTemplate(req.params.id, req.body);
      return sendSuccess(res, HTTP.OK, 'Template updated successfully', { template });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * DELETE /api/v1/admin/templates/:id
   */
  async deleteTemplate(req, res, next) {
    try {
      const result = await profileTemplateService.adminDeleteTemplate(req.params.id);
      return sendSuccess(res, HTTP.OK, result.message, result);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * PATCH /api/v1/admin/templates/:id/lock
   */
  async toggleTemplateLock(req, res, next) {
    try {
      const { isLocked } = toggleTemplateLockSchema.parse(req.body);
      const template = await profileTemplateService.adminToggleLock(req.params.id, isLocked);
      return sendSuccess(
        res,
        HTTP.OK,
        `Template ${isLocked ? 'locked' : 'unlocked'} successfully`,
        { template }
      );
    } catch (err) {
      return next(err);
    }
  }

  /**
   * POST /api/v1/admin/templates/bulk-lock
   */
  async bulkLockTemplates(req, res, next) {
    try {
      const validated = bulkLockTemplatesSchema.parse(req.body);
      const result = await profileTemplateService.adminBulkLock(validated);
      return sendSuccess(res, HTTP.OK, result.message, result);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * GET /api/v1/admin/orders
   */
  async listOrders(req, res, next) {
    try {
      const query = adminOrderQuerySchema.parse(req.query);
      const data = await adminService.listOrders(query);
      return sendSuccess(res, HTTP.OK, 'Orders retrieved successfully', data);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * GET /api/v1/admin/orders/:id
   */
  async getOrder(req, res, next) {
    try {
      const order = await adminService.getOrder(req.params.id);
      return sendSuccess(res, HTTP.OK, 'Order details retrieved successfully', { order });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * PATCH /api/v1/admin/orders/:id
   */
  async updateOrder(req, res, next) {
    try {
      const parsed = updateOrderAdminSchema.parse(req.body);
      const order = await adminService.updateOrder(
        req.user.id,
        req.params.id,
        parsed,
        { ip: req.ip, userAgent: req.get('user-agent') }
      );
      return sendSuccess(res, HTTP.OK, 'Order updated successfully', { order });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * POST /api/v1/admin/orders/:id/fulfill
   */
  async fulfillOrder(req, res, next) {
    try {
      const parsed = fulfillOrderAdminSchema.parse(req.body);
      const data = await adminService.fulfillOrder(
        req.user.id,
        req.params.id,
        parsed,
        { ip: req.ip, userAgent: req.get('user-agent') }
      );
      return sendSuccess(res, HTTP.OK, 'Order fulfilled and NFC card attached successfully', data);
    } catch (err) {
      return next(err);
    }
  }
}

export const adminController = new AdminController();
