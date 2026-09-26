import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const professionalIdentitySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    professionId: {
      type: Schema.Types.ObjectId,
      ref: 'Profession',
      default: null,
      index: true,
    },
    customTitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

professionalIdentitySchema.index({ userId: 1, isPrimary: 1 });
professionalIdentitySchema.index({ userId: 1, displayOrder: 1 });

professionalIdentitySchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    professionId: this.professionId ? this.professionId.toString() : null,
    customTitle: this.customTitle,
    isPrimary: this.isPrimary,
    displayOrder: this.displayOrder,
  };
};

export const ProfessionalIdentity =
  mongoose.models.ProfessionalIdentity ||
  model('ProfessionalIdentity', professionalIdentitySchema);
