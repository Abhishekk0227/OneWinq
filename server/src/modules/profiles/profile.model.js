import mongoose from 'mongoose';
import {
  PROFILE_STATE,
  VISIBILITY_MODE,
  SECTION_VISIBILITY,
} from '../../config/constants.js';

const { Schema, model } = mongoose;

const locationSchema = new Schema(
  {
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
    isRemote: { type: Boolean, default: false },
  },
  { _id: false },
);

const contactSchema = new Schema(
  {
    email: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    website: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const socialLinkSchema = new Schema(
  {
    id: { type: String, required: true },
    platform: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    label: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const educationEntrySchema = new Schema(
  {
    id: { type: String, required: true },
    institution: { type: String, required: true, trim: true },
    degree: { type: String, trim: true, default: '' },
    fieldOfStudy: { type: String, trim: true, default: '' },
    startMonth: { type: Number, min: 1, max: 12, default: null },
    startYear: { type: Number, min: 1900, max: 2100, default: null },
    endMonth: { type: Number, min: 1, max: 12, default: null },
    endYear: { type: Number, min: 1900, max: 2100, default: null },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    current: { type: Boolean, default: false },
    description: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const experienceEntrySchema = new Schema(
  {
    id: { type: String, required: true },
    company: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    location: { type: String, trim: true, default: '' },
    startMonth: { type: Number, min: 1, max: 12, default: null },
    startYear: { type: Number, min: 1900, max: 2100, default: null },
    endMonth: { type: Number, min: 1, max: 12, default: null },
    endYear: { type: Number, min: 1900, max: 2100, default: null },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    current: { type: Boolean, default: false },
    description: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const skillEntrySchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: '' },
    proficiency: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const projectEntrySchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    url: { type: String, trim: true, default: '' },
    mediaUrls: { type: [String], default: [] },
    startMonth: { type: Number, min: 1, max: 12, default: null },
    startYear: { type: Number, min: 1900, max: 2100, default: null },
    endMonth: { type: Number, min: 1, max: 12, default: null },
    endYear: { type: Number, min: 1900, max: 2100, default: null },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    current: { type: Boolean, default: false },
  },
  { _id: false },
);

const certificationEntrySchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    issuer: { type: String, required: true, trim: true },
    issueMonth: { type: Number, min: 1, max: 12, default: null },
    issueYear: { type: Number, min: 1900, max: 2100, default: null },
    expiryMonth: { type: Number, min: 1, max: 12, default: null },
    expiryYear: { type: Number, min: 1900, max: 2100, default: null },
    issueDate: { type: Date, default: null },
    expiryDate: { type: Date, default: null },
    doesNotExpire: { type: Boolean, default: false },
    credentialId: { type: String, trim: true, default: '' },
    url: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const serviceEntrySchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    priceRange: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const awardEntrySchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    issuer: { type: String, trim: true, default: '' },
    month: { type: Number, min: 1, max: 12, default: null },
    year: { type: Number, min: 1900, max: 2100, default: null },
    date: { type: Date, default: null },
    description: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const publicationEntrySchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    publisher: { type: String, trim: true, default: '' },
    month: { type: Number, min: 1, max: 12, default: null },
    year: { type: Number, min: 1900, max: 2100, default: null },
    date: { type: Date, default: null },
    url: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const genericEntrySchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    url: { type: String, trim: true, default: '' },
    month: { type: Number, min: 1, max: 12, default: null },
    year: { type: Number, min: 1900, max: 2100, default: null },
    date: { type: Date, default: null },
    metadata: { type: Schema.Types.Mixed, default: () => ({}) },
  },
  { _id: false },
);

const customBlockSchema = new Schema(
  {
    type: { type: String, enum: ['text', 'media', 'link'], default: 'text' },
    content: { type: String, trim: true, default: '' },
    mediaUrl: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const customSectionSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    blocks: { type: [customBlockSchema], default: [] },
    displayOrder: { type: Number, default: 0 },
  },
  { _id: false },
);

const temporaryModeSchema = new Schema(
  {
    mode: {
      type: String,
      enum: Object.values(VISIBILITY_MODE),
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    fallbackMode: {
      type: String,
      enum: Object.values(VISIBILITY_MODE),
      default: VISIBILITY_MODE.PUBLIC,
    },
  },
  { _id: false },
);

// Default visibility settings for known sections
export const DEFAULT_SECTION_VISIBILITY = {
  about: SECTION_VISIBILITY.PUBLIC,
  contact: SECTION_VISIBILITY.PUBLIC,
  location: SECTION_VISIBILITY.PUBLIC,
  socialLinks: SECTION_VISIBILITY.PUBLIC,
  education: SECTION_VISIBILITY.PUBLIC,
  experience: SECTION_VISIBILITY.PUBLIC,
  skills: SECTION_VISIBILITY.PUBLIC,
  projects: SECTION_VISIBILITY.PUBLIC,
  certifications: SECTION_VISIBILITY.PUBLIC,
  services: SECTION_VISIBILITY.PUBLIC,
  awards: SECTION_VISIBILITY.PUBLIC,
  publications: SECTION_VISIBILITY.PUBLIC,
  achievements: SECTION_VISIBILITY.PUBLIC,
  mediaGallery: SECTION_VISIBILITY.PUBLIC,
  blogs: SECTION_VISIBILITY.PUBLIC,
  research: SECTION_VISIBILITY.PUBLIC,
  courses: SECTION_VISIBILITY.PUBLIC,
  speaking: SECTION_VISIBILITY.PUBLIC,
  organizations: SECTION_VISIBILITY.PUBLIC,
  teaching: SECTION_VISIBILITY.PUBLIC,
};

// Default visibility for sensitive fields
export const DEFAULT_FIELD_VISIBILITY = {
  'contact.phone': SECTION_VISIBILITY.PRIVATE,
  'contact.email': SECTION_VISIBILITY.PUBLIC,
  'contact.address': SECTION_VISIBILITY.PRIVATE,
  'contact.website': SECTION_VISIBILITY.PUBLIC,
};

const profileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    personaName: {
      type: String,
      trim: true,
      default: 'Primary Profile',
    },
    professionTitle: {
      type: String,
      trim: true,
      default: '',
    },
    templateSlug: {
      type: String,
      trim: true,
      default: 'professional',
      lowercase: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: 'ProfileTemplate',
      default: null,
      index: true,
    },
    state: {
      type: String,
      enum: Object.values(PROFILE_STATE),
      default: PROFILE_STATE.DRAFT,
      index: true,
    },
    activeMode: {
      type: String,
      enum: Object.values(VISIBILITY_MODE),
      default: VISIBILITY_MODE.PUBLIC,
    },
    temporaryMode: {
      type: temporaryModeSchema,
      default: () => ({ mode: null, expiresAt: null, fallbackMode: VISIBILITY_MODE.PUBLIC }),
    },
    // Core profile details
    headline: { type: String, trim: true, maxlength: 160, default: '' },
    bio: { type: String, trim: true, maxlength: 2000, default: '' },
    avatarUrl: { type: String, default: null },
    avatarVisibility: {
      type: String,
      enum: Object.values(SECTION_VISIBILITY),
      default: SECTION_VISIBILITY.PUBLIC,
    },
    coverUrl: { type: String, default: null },
    location: { type: locationSchema, default: () => ({}) },
    contact: { type: contactSchema, default: () => ({}) },
    socialLinks: { type: [socialLinkSchema], default: [] },

    // Structured sections
    education: { type: [educationEntrySchema], default: [] },
    experience: { type: [experienceEntrySchema], default: [] },
    skills: { type: [skillEntrySchema], default: [] },
    projects: { type: [projectEntrySchema], default: [] },
    certifications: { type: [certificationEntrySchema], default: [] },
    services: { type: [serviceEntrySchema], default: [] },
    awards: { type: [awardEntrySchema], default: [] },
    publications: { type: [publicationEntrySchema], default: [] },
    achievements: { type: [genericEntrySchema], default: [] },
    mediaGallery: { type: [genericEntrySchema], default: [] },
    blogs: { type: [genericEntrySchema], default: [] },
    research: { type: [genericEntrySchema], default: [] },
    courses: { type: [genericEntrySchema], default: [] },
    speaking: { type: [genericEntrySchema], default: [] },
    organizations: { type: [genericEntrySchema], default: [] },
    teaching: { type: [genericEntrySchema], default: [] },

    // Custom block-based sections
    customSections: { type: [customSectionSchema], default: [] },

    // Visibility configuration maps
    sectionVisibility: {
      type: Map,
      of: String,
      default: () => new Map(Object.entries(DEFAULT_SECTION_VISIBILITY)),
    },
    fieldVisibility: {
      type: Schema.Types.Mixed,
      default: () => ({ ...DEFAULT_FIELD_VISIBILITY }),
    },

    // Order of sections in UI
    sectionOrder: {
      type: [String],
      default: [
        'about',
        'experience',
        'education',
        'skills',
        'projects',
        'certifications',
        'services',
        'socialLinks',
        'contact',
      ],
    },

    // Immutable snapshot of the published profile
    // Draft content is NEVER exposed to public visitors
    publishedData: {
      type: Schema.Types.Mixed,
      default: null,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

profileSchema.index({ userId: 1, isActive: 1 });

export const Profile = mongoose.models.Profile || model('Profile', profileSchema);
