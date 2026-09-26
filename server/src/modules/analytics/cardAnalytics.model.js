import mongoose from 'mongoose';

const { Schema } = mongoose;

const cardAnalyticsSchema = new Schema(
  {
    cardUid: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    tapCount: {
      type: Number,
      default: 0,
    },
    scanCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

cardAnalyticsSchema.index({ cardUid: 1, date: 1 }, { unique: true });
cardAnalyticsSchema.index({ userId: 1, date: 1 });

export const CardAnalytics = mongoose.model(
  'CardAnalytics',
  cardAnalyticsSchema,
);
