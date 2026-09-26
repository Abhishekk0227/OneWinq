import { z } from 'zod';
import { TICKET_CATEGORY, TICKET_PRIORITY } from '../../config/constants.js';

export const createTicketSchema = z.object({
  subject: z.string().min(3, 'Subject must be at least 3 characters').max(150),
  category: z
    .enum(Object.values(TICKET_CATEGORY))
    .optional()
    .default(TICKET_CATEGORY.OTHER),
  priority: z
    .enum(Object.values(TICKET_PRIORITY))
    .optional()
    .default(TICKET_PRIORITY.MEDIUM),
  message: z.string().min(1, 'Message is required').max(5000),
  attachments: z.array(z.string()).optional().default([]),
});

export const replyTicketSchema = z.object({
  text: z.string().min(1, 'Reply message cannot be empty').max(5000),
  attachments: z.array(z.string()).optional().default([]),
});
