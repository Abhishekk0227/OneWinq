import mongoose from 'mongoose';
import { EVENT_REGISTRATION_STATUS } from '../../config/constants.js';

const { Schema, model } = mongoose;

const eventRegistrationSchema = new Schema(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ticketCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(EVENT_REGISTRATION_STATUS),
      default: EVENT_REGISTRATION_STATUS.REGISTERED,
      index: true,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// One registration per user per event
eventRegistrationSchema.index({ eventId: 1, userId: 1 }, { unique: true });

export const EventRegistration =
  mongoose.models.EventRegistration || model('EventRegistration', eventRegistrationSchema);
