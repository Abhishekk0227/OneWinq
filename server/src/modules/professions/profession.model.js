import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const professionSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    normalizedName: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'ProfessionCategory',
      default: null,
      index: true,
    },
    isOfficial: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    subtitle: {
      type: String,
      default: '',
      trim: true,
    },
    aliases: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    recommendedSectionTypes: {
      type: [String],
      default: ['experience', 'skills', 'education', 'contact'],
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for quick matching and uniqueness checks
professionSchema.index({ normalizedName: 1, isOfficial: 1 });

professionSchema.pre('validate', function (next) {
  if (this.name) {
    this.normalizedName = this.name.trim().toLowerCase();
    if (!this.slug) {
      this.slug = this.normalizedName.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }
  }
  next();
});

professionSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    _id: this._id.toString(),
    name: this.name,
    slug: this.slug,
    subtitle: this.subtitle || '',
    aliases: this.aliases || [],
    isActive: this.isActive !== false,
    categoryId: this.categoryId ? this.categoryId.toString() : null,
    isOfficial: this.isOfficial,
    recommendedSectionTypes: this.recommendedSectionTypes,
  };
};

export const Profession = mongoose.models.Profession || model('Profession', professionSchema);
