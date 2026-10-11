import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const organizationFollowSchema = new Schema(
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
  },
  {
    timestamps: true,
  },
);

organizationFollowSchema.index({ organizationId: 1, userId: 1 }, { unique: true });

export const OrganizationFollow =
  mongoose.models.OrganizationFollow || model('OrganizationFollow', organizationFollowSchema);
