import { Ticket } from './ticket.model.js';
import { eventBus } from '../../events/eventBus.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../shared/errors.js';
import {
  TICKET_STATE,
  APP_EVENT,
  ERROR_CODE,
  HTTP,
} from '../../config/constants.js';

class SupportService {
  /**
   * Creates a new customer support ticket with initial message.
   * @param {string|mongoose.Types.ObjectId} userId
   * @param {object} input
   */
  async createTicket(userId, { subject, category, priority, message, attachments = [] }) {
    const ticketNumber = Ticket.generateTicketNumber();

    const ticket = new Ticket({
      ticketNumber,
      userId,
      subject,
      category,
      priority,
      status: TICKET_STATE.OPEN,
      messages: [
        {
          sender: userId,
          senderRole: 'USER',
          text: message,
          attachments,
          createdAt: new Date(),
        },
      ],
    });

    await ticket.save();

    eventBus.emit(APP_EVENT.TICKET_CREATED, {
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      userId,
      category: ticket.category,
      priority: ticket.priority,
    });

    logger.info('Support ticket created', {
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      userId,
    });

    return ticket;
  }

  /**
   * Lists tickets belonging to a user.
   * @param {string|mongoose.Types.ObjectId} userId
   * @param {object} options
   */
  async listTickets(userId, { status = null, limit = 20, cursor = null } = {}) {
    const query = { userId };
    if (status) {
      query.status = status;
    }
    if (cursor) {
      query.updatedAt = { $lt: new Date(cursor) };
    }

    const pageSize = Math.min(Number(limit) || 20, 50);
    const tickets = await Ticket.find(query)
      .sort({ updatedAt: -1 })
      .limit(pageSize + 1);

    const hasMore = tickets.length > pageSize;
    const results = hasMore ? tickets.slice(0, pageSize) : tickets;
    const nextCursor = hasMore ? results[results.length - 1].updatedAt.toISOString() : null;

    return {
      tickets: results,
      pagination: {
        hasMore,
        nextCursor,
      },
    };
  }

  /**
   * Retrieves single ticket details including message history.
   * @param {string|mongoose.Types.ObjectId} userId
   * @param {string} ticketId
   * @param {boolean} [isAdmin=false]
   */
  async getTicket(userId, ticketId, isAdmin = false) {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      throw new AppError('Ticket not found', ERROR_CODE.NOT_FOUND, HTTP.NOT_FOUND);
    }

    if (!isAdmin && ticket.userId.toString() !== userId.toString()) {
      throw new AppError(
        'Access denied: You can only view your own support tickets',
        ERROR_CODE.FORBIDDEN,
        HTTP.FORBIDDEN
      );
    }

    return ticket;
  }

  /**
   * Adds a reply message to a support ticket thread.
   * @param {string|mongoose.Types.ObjectId} userId
   * @param {string} ticketId
   * @param {object} input
   * @param {object} options
   */
  async replyTicket(userId, ticketId, { text, attachments = [] }, { isAdmin = false } = {}) {
    const ticket = await this.getTicket(userId, ticketId, isAdmin);

    if (ticket.status === TICKET_STATE.CLOSED) {
      throw new AppError(
        'Cannot reply to a closed ticket. Please open a new ticket for further assistance.',
        ERROR_CODE.VALIDATION_ERROR,
        HTTP.BAD_REQUEST
      );
    }

    const senderRole = isAdmin ? 'SUPPORT' : 'USER';
    ticket.messages.push({
      sender: userId,
      senderRole,
      text,
      attachments,
      createdAt: new Date(),
    });

    if (isAdmin) {
      ticket.status = TICKET_STATE.WAITING_FOR_USER;
    } else if (ticket.status === TICKET_STATE.WAITING_FOR_USER) {
      ticket.status = TICKET_STATE.IN_PROGRESS;
    }

    await ticket.save();

    eventBus.emit(APP_EVENT.TICKET_REPLIED, {
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      senderId: userId,
      senderRole,
    });

    logger.info('Support ticket replied', {
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      senderRole,
    });

    return ticket;
  }

  /**
   * Closes a ticket.
   * @param {string|mongoose.Types.ObjectId} userId
   * @param {string} ticketId
   * @param {boolean} [isAdmin=false]
   */
  async closeTicket(userId, ticketId, isAdmin = false) {
    const ticket = await this.getTicket(userId, ticketId, isAdmin);

    ticket.status = TICKET_STATE.CLOSED;
    ticket.closedAt = new Date();
    await ticket.save();

    eventBus.emit(APP_EVENT.TICKET_CLOSED, {
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      closedBy: userId,
    });

    logger.info('Support ticket closed', {
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
    });

    return ticket;
  }
}

export const supportService = new SupportService();
