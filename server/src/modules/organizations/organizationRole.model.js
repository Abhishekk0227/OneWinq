import mongoose from 'mongoose';
import { ORGANIZATION_ROLE, DEFAULT_ROLE_PERMISSIONS } from '../../config/constants.js';

const { Schema, model } = mongoose;

const organizationRoleSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      default: null, // null = system-wide default role template
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    permissions: {
      type: [String],
      default: [],
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

organizationRoleSchema.index({ organizationId: 1, name: 1 }, { unique: true });

export const OrganizationRole =
  mongoose.models.OrganizationRole || model('OrganizationRole', organizationRoleSchema);
