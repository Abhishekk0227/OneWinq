import mongoose from 'mongoose';

const { Schema } = mongoose;

const cardBatchSchema = new Schema(
  {
    batchNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    manufacturer: {
      type: String,
      required: true,
      trim: true,
    },
    cardType: {
      type: String,
      enum: ['pvc', 'metal', 'bamboo'],
      default: 'pvc',
    },
    totalCards: {
      type: Number,
      required: true,
      min: 1,
    },
    manufacturedAt: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

export const CardBatch = mongoose.model('CardBatch', cardBatchSchema);
