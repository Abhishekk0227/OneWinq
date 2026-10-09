import mongoose from 'mongoose';
import { ORGANIZATION_MEMBER_STATUS, ORGANIZATION_ROLE } from '../../config/constants.js';

const { Schema, model } = mongoose;

const organizationMemberSchema = new Schema(
  {
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
    role: {
      type: String,
      enum: Object.values(ORGANIZATION_ROLE),
      default: ORGANIZATION_ROLE.MEMBER,
      required: true,
      index: true,
    },
    roleId: {
      type: Schema.Types.ObjectId,
      ref: 'OrganizationRole',
      default: null,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
      index: true,
    },
    jobTitle: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    employeeId: {
      type: String,
      trim: true,
      maxlength: 60,
      default: '',
    },
    status: {
      type: String,
      enum: Object.values(ORGANIZATION_MEMBER_STATUS),
      default: ORGANIZATION_MEMBER_STATUS.ACTIVE,
      required: true,
      index: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    permissions: {
      type: [String],
      default: [], // Specific override permissions if customized
    },
    profileCompletionScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    approvalStatus: {
      type: String,
      default: 'DRAFT',
      index: true,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    draftProfile: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
    publishedProfile: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  },
);

// Exactly one active membership per user per organization
organizationMemberSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
organizationMemberSchema.index({ organizationId: 1, status: 1 });
organizationMemberSchema.index({ userId: 1, status: 1 });

organizationMemberSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    organizationId: this.organizationId?.toString ? this.organizationId.toString() : this.organizationId,
    userId: this.userId?.toString ? this.userId.toString() : this.userId,
    role: this.role,
    roleId: this.roleId?.toString ? this.roleId.toString() : null,
    departmentId: this.departmentId?.toString ? this.departmentId.toString() : null,
    jobTitle: this.jobTitle,
    employeeId: this.employeeId,
    status: this.status,
    joinedAt: this.joinedAt,
    invitedBy: this.invitedBy?.toString ? this.invitedBy.toString() : null,
    permissions: this.permissions,
    profileCompletionScore: this.profileCompletionScore ?? 0,
    approvalStatus: this.approvalStatus || 'DRAFT',
    isLocked: Boolean(this.isLocked),
    draftProfile: this.draftProfile || {},
    publishedProfile: this.publishedProfile || {},
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const OrganizationMember =
  mongoose.models.OrganizationMember || model('OrganizationMember', organizationMemberSchema);
