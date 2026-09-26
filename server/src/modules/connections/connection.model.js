import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/**
 * Order two user IDs deterministically to ensure a canonical pair.
 *
 * @param {string|mongoose.Types.ObjectId} userA
 * @param {string|mongoose.Types.ObjectId} userB
 * @returns {{ userLow: mongoose.Types.ObjectId, userHigh: mongoose.Types.ObjectId, isSwapped: boolean }}
 */
export function getCanonicalUserPair(userA, userB) {
  const strA = String(userA);
  const strB = String(userB);

  if (strA === strB) {
    throw new Error('Cannot create a connection with oneself');
  }

  if (strA < strB) {
    return {
      userLow: new mongoose.Types.ObjectId(strA),
      userHigh: new mongoose.Types.ObjectId(strB),
      isSwapped: false,
    };
  }

  return {
    userLow: new mongoose.Types.ObjectId(strB),
    userHigh: new mongoose.Types.ObjectId(strA),
    isSwapped: true,
  };
}

const connectionSchema = new Schema(
  {
    userLow: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userHigh: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    state: {
      type: String,
      enum: ['NONE', 'PENDING', 'CONNECTED', 'BLOCKED'],
      default: 'NONE',
      index: true,
    },
    actionBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    connectedAt: {
      type: Date,
      default: null,
    },
    blockedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Exactly one relationship document per pair
connectionSchema.index({ userLow: 1, userHigh: 1 }, { unique: true });
connectionSchema.index({ userLow: 1, state: 1 });
connectionSchema.index({ userHigh: 1, state: 1 });
connectionSchema.index({ actionBy: 1, state: 1 });

/**
 * Get the relative relationship state from the perspective of a specific user.
 *
 * @param {string|mongoose.Types.ObjectId} viewerId
 * @returns {string} 'NONE' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'CONNECTED' | 'BLOCKED_BY_ME' | 'BLOCKED_BY_OTHER'
 */
connectionSchema.methods.getRelativeState = function (viewerId) {
  if (!viewerId) {return this.state;}
  const viewerStr = String(viewerId);
  const actionByStr = String(this.actionBy);

  if (this.state === 'PENDING') {
    return viewerStr === actionByStr ? 'PENDING_SENT' : 'PENDING_RECEIVED';
  }

  if (this.state === 'BLOCKED') {
    return viewerStr === actionByStr ? 'BLOCKED_BY_ME' : 'BLOCKED_BY_OTHER';
  }

  return this.state;
};

/**
 * Returns the "other" user ID in this relationship given one participant.
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {mongoose.Types.ObjectId}
 */
connectionSchema.methods.getOtherUserId = function (userId) {
  const userStr = String(userId);
  return String(this.userLow) === userStr ? this.userHigh : this.userLow;
};

export const Connection =
  mongoose.models.Connection || model('Connection', connectionSchema);
