import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const profileTemplateSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 60,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 400,
    },
    category: {
      type: String,
      default: 'General',
      trim: true,
    },
    recommendedSectionIds: {
      type: [String],
      default: ['about', 'experience', 'skills', 'projects', 'education'],
    },
    layoutConfig: {
      heroStyle: {
        type: String,
        enum: ['clean', 'banner', 'split', 'compact', 'media'],
        default: 'clean',
      },
      cardStyle: {
        type: String,
        enum: ['modern', 'minimal', 'bordered', 'glass'],
        default: 'modern',
      },
      metadata: {
        type: Schema.Types.Mixed,
        default: () => ({}),
      },
    },
    themeConfig: {
      accentColor: { type: String, default: '#6366F1' },
      fontPreset: { type: String, default: 'inter' },
      badgeStyle: { type: String, default: 'subtle' },
    },
    previewImage: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isLocked: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

profileTemplateSchema.methods.toSafeObject = function () {
  const isLocked = this.slug === 'professional' ? false : Boolean(this.isLocked);
  return {
    id: this._id.toString(),
    _id: this._id.toString(),
    name: this.name,
    slug: this.slug,
    description: this.description,
    category: this.category,
    recommendedSectionIds: this.recommendedSectionIds || [],
    layoutConfig: this.layoutConfig || {},
    themeConfig: this.themeConfig || {},
    previewImage: this.previewImage,
    status: this.status,
    displayOrder: this.displayOrder,
    isFeatured: Boolean(this.isFeatured),
    isLocked,
    comingSoon: isLocked,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const ProfileTemplate =
  mongoose.models.ProfileTemplate || model('ProfileTemplate', profileTemplateSchema);
