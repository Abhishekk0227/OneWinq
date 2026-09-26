import mongoose from 'mongoose';
import { DATA_EXPORT_STATUS } from '../../config/constants.js';

const dataExportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    format: {
      type: String,
      enum: ['JSON', 'CSV'],
      default: 'JSON',
    },
    status: {
      type: String,
      enum: Object.values(DATA_EXPORT_STATUS),
      default: DATA_EXPORT_STATUS.PENDING,
      index: true,
    },
    downloadUrl: {
      type: String,
      default: null,
    },
    fileSizeBytes: {
      type: Number,
      default: 0,
    },
    dataPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

dataExportSchema.index({ userId: 1, createdAt: -1 });

export const DataExport = mongoose.model('DataExport', dataExportSchema);
