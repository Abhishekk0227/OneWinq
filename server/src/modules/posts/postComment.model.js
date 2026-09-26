import mongoose from 'mongoose';
import { COMMENT_STATE } from '../../config/constants.js';

const { Schema } = mongoose;

const postCommentSchema = new Schema(
  {
    postId: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'PostComment',
      default: null,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    likesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    state: {
      type: String,
      enum: Object.values(COMMENT_STATE),
      default: COMMENT_STATE.ACTIVE,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

postCommentSchema.index({ postId: 1, parentId: 1, createdAt: 1 });

export const PostComment = mongoose.model('PostComment', postCommentSchema);
