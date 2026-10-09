import mongoose from 'mongoose';
import { PROFILE_APPROVAL_STATUS } from '../../config/constants.js';

const { Schema, model } = mongoose;

const diffEntrySchema = new Schema(
  {
    field: { type: String, required: true },
    oldValue: { type: Schema.Types.Mixed, default: null },
    newValue: { type: Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const profileApprovalSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    memberId: {
      type: Schema.Types.ObjectId,
      ref: 'OrganizationMember',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(PROFILE_APPROVAL_STATUS),
      default: PROFILE_APPROVAL_STATUS.PENDING_REVIEW,
      required: true,
      index: true,
    },
    diffSummary: {
      type: [diffEntrySchema],
      default: [],
    },
    draftSnapshot: {
      type: Schema.Types.Mixed,
      required: true,
    },
    reviewerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewNote: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

profileApprovalSchema.index({ organizationId: 1, status: 1 });
profileApprovalSchema.index({ memberId: 1, createdAt: -1 });

export const ProfileApproval =
  mongoose.models.ProfileApproval || model('ProfileApproval', profileApprovalSchema);
