import mongoose from 'mongoose';
import { EVENT_STATUS, EVENT_ELIGIBILITY_TYPE } from '../../config/constants.js';

const { Schema, model } = mongoose;

const eventSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
    },
    category: {
      type: String,
      default: 'ALL_HANDS',
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: '',
    },
    bannerUrl: {
      type: String,
      default: null,
    },
    location: {
      type: {
        type: String,
        enum: ['PHYSICAL', 'VIRTUAL', 'HYBRID'],
        default: 'VIRTUAL',
      },
      venue: { type: String, default: '' },
      meetingUrl: { type: String, default: '' },
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    maxCapacity: {
      type: Number,
      default: null, // null = unlimited
    },
    registeredCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    eligibility: {
      type: {
        type: String,
        enum: Object.values(EVENT_ELIGIBILITY_TYPE),
        default: EVENT_ELIGIBILITY_TYPE.ALL,
      },
      departmentIds: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Department',
        },
      ],
      roleIds: [
        {
          type: String,
        },
      ],
    },
    status: {
      type: String,
      enum: Object.values(EVENT_STATUS),
      default: EVENT_STATUS.PUBLISHED,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

eventSchema.index({ organizationId: 1, startDate: 1 });
eventSchema.index({ organizationId: 1, status: 1 });

export const Event = mongoose.models.Event || model('Event', eventSchema);
