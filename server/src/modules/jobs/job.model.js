import mongoose from 'mongoose';
import {
  JOB_STATUS,
  EMPLOYMENT_TYPE,
  WORKPLACE_TYPE,
} from '../../config/constants.js';

const { Schema, model } = mongoose;

const jobLocationSchema = new Schema(
  {
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
    isRemote: { type: Boolean, default: false },
  },
  { _id: false },
);

const jobSalarySchema = new Schema(
  {
    min: { type: Number, default: null },
    max: { type: Number, default: null },
    currency: { type: String, trim: true, uppercase: true, default: 'INR' },
    period: { type: String, enum: ['YEARLY', 'MONTHLY', 'HOURLY'], default: 'YEARLY' },
    isDisclosed: { type: Boolean, default: true },
  },
  { _id: false },
);

const jobSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 150,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20000,
    },
    employmentType: {
      type: String,
      enum: Object.values(EMPLOYMENT_TYPE),
      default: EMPLOYMENT_TYPE.FULL_TIME,
      required: true,
      index: true,
    },
    workplaceType: {
      type: String,
      enum: Object.values(WORKPLACE_TYPE),
      default: WORKPLACE_TYPE.ON_SITE,
      required: true,
      index: true,
    },
    location: {
      type: jobLocationSchema,
      default: () => ({}),
    },
    salary: {
      type: jobSalarySchema,
      default: () => ({}),
    },
    skills: {
      type: [String],
      default: [],
      index: true,
    },
    experienceLevel: {
      type: String,
      trim: true,
      default: '', // 'Entry', 'Mid', 'Senior', 'Lead', 'Executive'
    },
    status: {
      type: String,
      enum: Object.values(JOB_STATUS),
      default: JOB_STATUS.PUBLISHED,
      required: true,
      index: true,
    },
    applicationsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    viewsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for tenant and discovery queries
jobSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ title: 'text', description: 'text', skills: 'text' });

jobSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    organizationId: this.organizationId?.toString ? this.organizationId.toString() : this.organizationId,
    creatorId: this.creatorId?.toString ? this.creatorId.toString() : this.creatorId,
    title: this.title,
    departmentId: this.departmentId?.toString ? this.departmentId.toString() : null,
    description: this.description,
    employmentType: this.employmentType,
    workplaceType: this.workplaceType,
    location: this.location,
    salary: this.salary,
    skills: this.skills,
    experienceLevel: this.experienceLevel,
    status: this.status,
    applicationsCount: this.applicationsCount,
    viewsCount: this.viewsCount,
    publishedAt: this.publishedAt,
    expiresAt: this.expiresAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Job = mongoose.models.Job || model('Job', jobSchema);
