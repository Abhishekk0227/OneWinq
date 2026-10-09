import mongoose from 'mongoose';
import { ORGANIZATION_TYPE, ORGANIZATION_STATUS } from '../../config/constants.js';

const { Schema, model } = mongoose;

const organizationLocationSchema = new Schema(
  {
    address: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
    zipCode: { type: String, trim: true, default: '' },
    isRemoteFriendly: { type: Boolean, default: false },
  },
  { _id: false },
);

const organizationContactSchema = new Schema(
  {
    email: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    supportEmail: { type: String, trim: true, default: '' },
    workingHours: { type: String, trim: true, default: '' },
    directionsUrl: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const organizationOverviewStatsSchema = new Schema(
  {
    foundedYear: { type: Number, default: null },
    locationShort: { type: String, trim: true, default: '' },
    teamSize: { type: String, trim: true, default: '' },
    customerBase: { type: String, trim: true, default: '' },
    customMetrics: {
      type: [
        {
          label: { type: String, trim: true, required: true },
          value: { type: String, trim: true, required: true },
        },
      ],
      default: [],
    },
  },
  { _id: false },
);

const organizationAboutStorySchema = new Schema(
  {
    aboutCompany: { type: String, trim: true, default: '' },
    mission: { type: String, trim: true, default: '' },
    vision: { type: String, trim: true, default: '' },
    story: { type: String, trim: true, default: '' },
    values: {
      type: [
        {
          title: { type: String, trim: true, required: true },
          description: { type: String, trim: true, default: '' },
          icon: { type: String, trim: true, default: 'Sparkles' },
        },
      ],
      default: [],
    },
  },
  { _id: false },
);

const organizationBrandingSchema = new Schema(
  {
    logoUrl: { type: String, default: null },
    coverUrl: { type: String, default: null },
    faviconUrl: { type: String, default: null },
    primaryColor: { type: String, default: '#7c3aed' },
    secondaryColor: { type: String, default: '#6366f1' },
    accentColor: { type: String, default: '#06b6d4' },
    fontHeading: { type: String, default: 'Inter' },
    fontBody: { type: String, default: 'Inter' },
    themeMode: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
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
    requireApprovalForProfileChanges: { type: Boolean, default: true },
    allowCustomThemes: { type: Boolean, default: true },
    defaultVisibility: {
      type: String,
      enum: ['public', 'internal', 'private'],
      default: 'public',
    },
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
    contact: {
      type: organizationContactSchema,
      default: () => ({}),
    },
    overviewStats: {
      type: organizationOverviewStatsSchema,
      default: () => ({}),
    },
    about: {
      type: organizationAboutStorySchema,
      default: () => ({}),
    },
    branding: {
      type: organizationBrandingSchema,
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
    // ---- 8-Section Company Brand Showcase & Offerings -----------------------
    products: {
      type: [
        {
          name: { type: String, trim: true, required: true },
          title: { type: String, trim: true },
          description: { type: String, trim: true, default: '' },
          imageUrl: { type: String, default: null },
          linkUrl: { type: String, default: '' },
          ctaUrl: { type: String, default: '' },
          tag: { type: String, trim: true, default: '' },
          category: { type: String, trim: true, default: '' },
          badge: { type: String, trim: true, default: '' },
          order: { type: Number, default: 0 },
          isVisible: { type: Boolean, default: true },
        },
      ],
      default: [],
    },
    projects: {
      type: [
        {
          title: { type: String, trim: true, required: true },
          description: { type: String, trim: true, default: '' },
          client: { type: String, trim: true, default: '' },
          coverUrl: { type: String, default: null },
          imageUrl: { type: String, default: null },
          linkUrl: { type: String, default: '' },
          projectUrl: { type: String, default: '' },
          metrics: { type: String, trim: true, default: '' },
          category: { type: String, trim: true, default: '' },
          status: { type: String, enum: ['all', 'ongoing', 'completed'], default: 'completed' },
          order: { type: Number, default: 0 },
          isVisible: { type: Boolean, default: true },
        },
      ],
      default: [],
    },
    achievements: {
      type: [
        {
          title: { type: String, trim: true, required: true },
          subtitle: { type: String, trim: true, default: '' },
          issuer: { type: String, trim: true, default: '' },
          year: { type: Number, default: null },
          description: { type: String, trim: true, default: '' },
          badgeUrl: { type: String, default: null },
          metric: { type: String, trim: true, default: '' },
          order: { type: Number, default: 0 },
          isVisible: { type: Boolean, default: true },
        },
      ],
      default: [],
    },
    mediaGallery: {
      type: [
        {
          title: { type: String, trim: true, default: '' },
          type: { type: String, enum: ['all', 'photo', 'video', 'news', 'event', 'IMAGE', 'VIDEO'], default: 'photo' },
          url: { type: String, required: true },
          thumbnailUrl: { type: String, default: null },
          date: { type: String, trim: true, default: '' },
          caption: { type: String, trim: true, default: '' },
          description: { type: String, trim: true, default: '' },
          order: { type: Number, default: 0 },
          isVisible: { type: Boolean, default: true },
        },
      ],
      default: [],
    },
    navigation: {
      type: [
        {
          navId: { type: String, trim: true },
          label: { type: String, trim: true },
          targetSectionId: { type: String, trim: true },
          icon: { type: String, trim: true },
          order: { type: Number, default: 0 },
          isVisible: { type: Boolean, default: true },
        },
      ],
      default: [],
    },
    showcaseSections: {
      type: [
        {
          title: { type: String, trim: true, required: true },
          content: { type: String, trim: true, default: '' },
          sortOrder: { type: Number, default: 0 },
        },
      ],
      default: [],
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
    contact: this.contact,
    overviewStats: this.overviewStats,
    about: this.about,
    branding: this.branding,
    contactEmail: this.contactEmail,
    contactPhone: this.contactPhone,
    socialLinks: this.socialLinks,
    ownerId: this.ownerId?.toString ? this.ownerId.toString() : this.ownerId,
    isVerified: this.isVerified,
    verifiedAt: this.verifiedAt,
    membersCount: this.membersCount,
    jobsCount: this.jobsCount,
    settings: this.settings,
    products: this.products || [],
    projects: this.projects || [],
    achievements: this.achievements || [],
    mediaGallery: this.mediaGallery || [],
    navigation: this.navigation || [],
    showcaseSections: this.showcaseSections || [],
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Organization =
  mongoose.models.Organization || model('Organization', organizationSchema);
