import mongoose from 'mongoose';
import { POST_STATE } from '../../config/constants.js';

const { Schema } = mongoose;

const postMediaSchema = new Schema(
  {
    mediaId: { type: String, default: null },
    type: { type: String, enum: ['IMAGE', 'VIDEO'], required: true },
    url: { type: String, required: true },
    thumbnailUrl: { type: String, default: null },
  },
  { _id: false },
);

const postSchema = new Schema(
  {
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: '',
    },
    media: {
      type: [postMediaSchema],
      default: [],
    },
    state: {
      type: String,
      enum: Object.values(POST_STATE),
      default: POST_STATE.ACTIVE,
      index: true,
    },
    visibility: {
      type: String,
      enum: ['PUBLIC', 'CONNECTIONS_ONLY', 'PRIVATE'],
      default: 'PUBLIC',
      index: true,
    },
    likesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    sharesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    savesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    pinned: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

postSchema.index({ authorId: 1, state: 1, createdAt: -1 });
postSchema.index({ state: 1, createdAt: -1 });

export const Post = mongoose.model('Post', postSchema);
