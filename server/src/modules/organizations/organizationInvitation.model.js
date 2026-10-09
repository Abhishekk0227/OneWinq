import mongoose from 'mongoose';
import { ORGANIZATION_ROLE } from '../../config/constants.js';

const { Schema, model } = mongoose;

const organizationInvitationSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      enum: Object.values(ORGANIZATION_ROLE),
      default: ORGANIZATION_ROLE.MEMBER,
      required: true,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
    jobTitle: {
      type: String,
      trim: true,
      default: '',
    },
    tokenHash: {
      type: String,
      required: true,
      index: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'REVOKED'],
      default: 'PENDING',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

organizationInvitationSchema.index({ organizationId: 1, email: 1, status: 1 });

organizationInvitationSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    organizationId: this.organizationId?.toString ? this.organizationId.toString() : this.organizationId,
    email: this.email,
    role: this.role,
    departmentId: this.departmentId?.toString ? this.departmentId.toString() : null,
    jobTitle: this.jobTitle,
    invitedBy: this.invitedBy?.toString ? this.invitedBy.toString() : this.invitedBy,
    status: this.status,
    expiresAt: this.expiresAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const OrganizationInvitation =
  mongoose.models.OrganizationInvitation ||
  model('OrganizationInvitation', organizationInvitationSchema);
