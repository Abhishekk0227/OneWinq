import { supportService } from './support.service.js';
import { createTicketSchema, replyTicketSchema } from './support.validation.js';
import { sendSuccess } from '../../shared/response.js';
import { HTTP } from '../../config/constants.js';

export class SupportController {
  /**
   * POST /api/v1/support/tickets
   * Opens a new support ticket.
   */
  async createTicket(req, res, next) {
    try {
      const parsed = createTicketSchema.parse(req.body);
      const ticket = await supportService.createTicket(req.user.id, parsed);
      return sendSuccess(res, HTTP.CREATED, 'Support ticket created successfully', { ticket });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * GET /api/v1/support/tickets
   * Retrieves all support tickets for the current user.
   */
  async listTickets(req, res, next) {
    try {
      const data = await supportService.listTickets(req.user.id, req.query);
      return sendSuccess(res, HTTP.OK, 'Tickets retrieved successfully', data);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * GET /api/v1/support/tickets/:id
   * Retrieves single ticket and message thread.
   */
  async getTicket(req, res, next) {
    try {
      const ticket = await supportService.getTicket(req.user.id, req.params.id);
      return sendSuccess(res, HTTP.OK, 'Ticket details retrieved successfully', { ticket });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * POST /api/v1/support/tickets/:id/reply
   * Adds a reply to a support ticket thread.
   */
  async replyTicket(req, res, next) {
    try {
      const parsed = replyTicketSchema.parse(req.body);
      const ticket = await supportService.replyTicket(req.user.id, req.params.id, parsed);
      return sendSuccess(res, HTTP.OK, 'Reply sent successfully', { ticket });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * POST /api/v1/support/tickets/:id/close
   * Closes a support ticket.
   */
  async closeTicket(req, res, next) {
    try {
      const ticket = await supportService.closeTicket(req.user.id, req.params.id);
      return sendSuccess(res, HTTP.OK, 'Ticket closed successfully', { ticket });
    } catch (err) {
      return next(err);
    }
  }
}

export const supportController = new SupportController();
