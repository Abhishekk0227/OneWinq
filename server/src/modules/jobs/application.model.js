import mongoose from 'mongoose';
import { APPLICATION_STATUS } from '../../config/constants.js';

const { Schema, model } = mongoose;

const applicationNoteSchema = new Schema(
  {
    authorMemberId: {
      type: Schema.Types.ObjectId,
      ref: 'OrganizationMember',
      required: true,
    },
    note: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const applicationSchema = new Schema(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    applicantId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(APPLICATION_STATUS),
      default: APPLICATION_STATUS.SUBMITTED,
      required: true,
      index: true,
    },
    resumeUrl: {
      type: String,
      default: null,
    },
    coverLetter: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: '',
    },
    applicantSnapshot: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
    internalNotes: {
      type: [applicationNoteSchema],
      default: [],
    },
    statusHistory: {
      type: [
        {
          status: { type: String, required: true },
          changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
          changedAt: { type: Date, default: Date.now },
          comment: { type: String, default: '' },
        },
      ],
      default: () => [{ status: APPLICATION_STATUS.SUBMITTED, changedAt: new Date(), comment: 'Application submitted' }],
    },
  },
  {
    timestamps: true,
  },
);

// Unique compound constraint: Candidate can apply only once per job posting
applicationSchema.index({ jobId: 1, applicantId: 1 }, { unique: true });
applicationSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
applicationSchema.index({ applicantId: 1, createdAt: -1 });

applicationSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    jobId: this.jobId?.toString ? this.jobId.toString() : this.jobId,
    organizationId: this.organizationId?.toString ? this.organizationId.toString() : this.organizationId,
    applicantId: this.applicantId?.toString ? this.applicantId.toString() : this.applicantId,
    status: this.status,
    resumeUrl: this.resumeUrl,
    coverLetter: this.coverLetter,
    applicantSnapshot: this.applicantSnapshot,
    internalNotes: this.internalNotes,
    statusHistory: this.statusHistory,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Application =
  mongoose.models.Application || model('Application', applicationSchema);
