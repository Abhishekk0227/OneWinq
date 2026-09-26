import mongoose from 'mongoose';

const { Schema } = mongoose;

const rawEventSchema = new Schema(
  {
    eventType: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    targetUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actorUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    cardUid: {
      type: String,
      default: null,
      index: true,
      trim: true,
      uppercase: true,
    },
    ip: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    device: {
      deviceType: { type: String, default: 'desktop' }, // mobile, desktop, tablet
      os: { type: String, default: 'unknown' },
      browser: { type: String, default: 'unknown' },
    },
    country: {
      type: String,
      default: 'Unknown',
    },
    city: {
      type: String,
      default: 'Unknown',
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// High-throughput query indexes
rawEventSchema.index({ targetUserId: 1, timestamp: -1 });
rawEventSchema.index({ targetUserId: 1, eventType: 1, timestamp: -1 });
rawEventSchema.index({ cardUid: 1, timestamp: -1 });

export const RawEvent = mongoose.model('RawEvent', rawEventSchema);
