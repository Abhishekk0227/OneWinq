import mongoose from 'mongoose';
import { ORGANIZATION_TYPE, ORGANIZATION_STATUS } from '../../config/constants.js';

const { Schema, model } = mongoose;

const organizationLocationSchema = new Schema(
  {
    address: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
    isRemoteFriendly: { type: Boolean, default: false },
  },
  { _id: false },
);

const organizationSocialLinkSchema = new Schema(
  {
    platform: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const organizationSettingsSchema = new Schema(
  {
    allowMemberJobPosting: { type: Boolean, default: false },
    requireApprovalForCards: { type: Boolean, default: true },
    isPublicDirectory: { type: Boolean, default: true },
    defaultTemplateId: {
      type: Schema.Types.ObjectId,
      ref: 'ProfileTemplate',
      default: null,
    },
  },
  { _id: false },
);

const organizationSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
      match: [/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens'],
    },
    type: {
      type: String,
      enum: Object.values(ORGANIZATION_TYPE),
      default: ORGANIZATION_TYPE.COMPANY,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(ORGANIZATION_STATUS),
      default: ORGANIZATION_STATUS.ACTIVE,
      required: true,
      index: true,
    },
    tagline: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: '',
    },
    logoUrl: {
      type: String,
      default: null,
    },
    bannerUrl: {
      type: String,
      default: null,
    },
    website: {
      type: String,
      trim: true,
      default: '',
    },
    industry: {
      type: String,
      trim: true,
      default: '',
    },
    size: {
      type: String,
      trim: true,
      default: '1-10', // '1-10', '11-50', '51-200', '201-500', '500+'
    },
    foundedYear: {
      type: Number,
      min: 1800,
      max: 2100,
      default: null,
    },
    location: {
      type: organizationLocationSchema,
      default: () => ({}),
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    contactPhone: {
      type: String,
      trim: true,
      default: '',
    },
    socialLinks: {
      type: [organizationSocialLinkSchema],
      default: [],
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    membersCount: {
      type: Number,
      default: 1,
      min: 0,
    },
    jobsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    settings: {
      type: organizationSettingsSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
organizationSchema.index({ slug: 1 }, { unique: true });
organizationSchema.index({ name: 'text', description: 'text', industry: 'text' });
organizationSchema.index({ type: 1, status: 1 });
organizationSchema.index({ isVerified: 1, createdAt: -1 });

organizationSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    slug: this.slug,
    type: this.type,
    status: this.status,
    tagline: this.tagline,
    description: this.description,
    logoUrl: this.logoUrl,
    bannerUrl: this.bannerUrl,
    website: this.website,
    industry: this.industry,
    size: this.size,
    foundedYear: this.foundedYear,
    location: this.location,
    contactEmail: this.contactEmail,
    contactPhone: this.contactPhone,
    socialLinks: this.socialLinks,
    ownerId: this.ownerId?.toString ? this.ownerId.toString() : this.ownerId,
    isVerified: this.isVerified,
    verifiedAt: this.verifiedAt,
    membersCount: this.membersCount,
    jobsCount: this.jobsCount,
    settings: this.settings,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Organization =
  mongoose.models.Organization || model('Organization', organizationSchema);
