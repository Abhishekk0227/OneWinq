import mongoose from 'mongoose';

const { Schema } = mongoose;

const profileAnalyticsSchema = new Schema(
  {
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
    viewsCount: {
      type: Number,
      default: 0,
    },
    uniqueViewersCount: {
      type: Number,
      default: 0,
    },
    connectionsRequested: {
      type: Number,
      default: 0,
    },
    connectionsAccepted: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

profileAnalyticsSchema.index({ userId: 1, date: 1 }, { unique: true });

export const ProfileAnalytics = mongoose.model(
  'ProfileAnalytics',
  profileAnalyticsSchema,
);
