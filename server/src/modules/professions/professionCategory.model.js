import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const professionCategorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    icon: {
      type: String,
      trim: true,
      default: null,
    },
    displayOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

professionCategorySchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    slug: this.slug,
    icon: this.icon,
    displayOrder: this.displayOrder,
    isActive: this.isActive,
  };
};

export const ProfessionCategory =
  mongoose.models.ProfessionCategory || model('ProfessionCategory', professionCategorySchema);
