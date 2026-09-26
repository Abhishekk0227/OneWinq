import mongoose from 'mongoose';

const { Schema } = mongoose;

const postSaveSchema = new Schema(
  {
    postId: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

postSaveSchema.index({ postId: 1, userId: 1 }, { unique: true });

export const PostSave = mongoose.model('PostSave', postSaveSchema);
