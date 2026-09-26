import mongoose from 'mongoose';
import {
  TICKET_STATE,
  TICKET_CATEGORY,
  TICKET_PRIORITY,
} from '../../config/constants.js';

const messageSubSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderRole: {
      type: String,
      enum: ['USER', 'SUPPORT', 'ADMIN'],
      default: 'USER',
    },
    text: {
      type: String,
      required: true,
      maxlength: 5000,
      trim: true,
    },
    attachments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media',
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 150,
      trim: true,
    },
    category: {
      type: String,
      enum: Object.values(TICKET_CATEGORY),
      default: TICKET_CATEGORY.OTHER,
    },
    priority: {
      type: String,
      enum: Object.values(TICKET_PRIORITY),
      default: TICKET_PRIORITY.MEDIUM,
    },
    status: {
      type: String,
      enum: Object.values(TICKET_STATE),
      default: TICKET_STATE.OPEN,
      index: true,
    },
    messages: [messageSubSchema],
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

ticketSchema.index({ userId: 1, createdAt: -1 });

ticketSchema.statics.generateTicketNumber = function () {
  const year = new Date().getFullYear();
  const randomPart = Math.floor(10000 + Math.random() * 90000);
  return `TICK-${year}-${randomPart}`;
};

export const Ticket = mongoose.model('Ticket', ticketSchema);
