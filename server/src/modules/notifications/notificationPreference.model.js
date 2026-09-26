import mongoose from 'mongoose';

const { Schema } = mongoose;

const notificationPreferenceSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    inApp: {
      connectionRequests: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
      profileViews: { type: Boolean, default: true },
      system: { type: Boolean, default: true },
    },
    email: {
      connectionRequests: { type: Boolean, default: true },
      messages: { type: Boolean, default: false },
      profileViews: { type: Boolean, default: false },
      marketing: { type: Boolean, default: false },
      security: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  },
);

export const NotificationPreference = mongoose.model(
  'NotificationPreference',
  notificationPreferenceSchema,
);
