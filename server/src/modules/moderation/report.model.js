import mongoose from 'mongoose';
import {
  REPORT_STATE,
  REPORT_TARGET_TYPE,
  REPORT_REASON,
  REPORT_ACTION,
} from '../../config/constants.js';

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    targetType: {
      type: String,
      required: true,
      enum: Object.values(REPORT_TARGET_TYPE),
    },
    targetId: {
      type: String,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      enum: Object.values(REPORT_REASON),
    },
    description: {
      type: String,
      maxlength: 1000,
      trim: true,
      default: '',
    },
    evidenceMedia: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media',
      },
    ],
    status: {
      type: String,
      required: true,
      enum: Object.values(REPORT_STATE),
      default: REPORT_STATE.OPEN,
      index: true,
    },
    actionTaken: {
      type: String,
      enum: Object.values(REPORT_ACTION),
      default: REPORT_ACTION.NONE,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolutionNotes: {
      type: String,
      maxlength: 1000,
      trim: true,
      default: '',
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

reportSchema.index({ reporter: 1, targetType: 1, targetId: 1, status: 1 });

export const Report = mongoose.model('Report', reportSchema);
