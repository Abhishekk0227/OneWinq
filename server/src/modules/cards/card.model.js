import mongoose from 'mongoose';
import { CARD_STATE } from '../../config/constants.js';

const { Schema } = mongoose;

const cardSchema = new Schema(
  {
    cardCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    cardId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    cardUid: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    url: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    nfcUid: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
      sparse: true,
      index: true,
    },
    edition: {
      type: String,
      default: 'PVC',
      trim: true,
      uppercase: true,
    },
    secretHash: {
      type: String,
      required: true,
      select: false,
    },
    batchId: {
      type: Schema.Types.ObjectId,
      ref: 'CardBatch',
      default: null,
    },
    state: {
      type: String,
      enum: Object.values(CARD_STATE),
      default: CARD_STATE.UNASSIGNED,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(CARD_STATE),
      default: CARD_STATE.UNASSIGNED,
      index: true,
    },
    assignedUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    assignedIdentity: {
      type: Schema.Types.ObjectId,
      ref: 'ProfessionalIdentity',
      default: null,
    },
    customSlug: {
      type: String,
      trim: true,
      lowercase: true,
    },
    material: {
      type: String,
      default: 'pvc',
      trim: true,
      lowercase: true,
    },
    nickname: {
      type: String,
      default: null,
      trim: true,
    },
    tapCount: {
      type: Number,
      default: 0,
    },
    qrScanCount: {
      type: Number,
      default: 0,
    },
    lastTappedAt: {
      type: Date,
      default: null,
    },
    lastScannedAt: {
      type: Date,
      default: null,
    },
    activatedAt: {
      type: Date,
      default: null,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    firstAssignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    firstAssignedAt: {
      type: Date,
      default: null,
    },
    everAssigned: {
      type: Boolean,
      default: false,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.secretHash;
        ret.cardId = ret.cardId || ret.cardCode || ret.cardUid;
        ret.cardCode = ret.cardCode || ret.cardId || ret.cardUid;
        ret.cardUid = ret.cardUid || ret.cardCode || ret.cardId;
        const baseUrl = (process.env.APP_URL || 'https://one-winq.vercel.app').replace(/\/+$/, '');
        if (!ret.url || ret.url.includes('localhost') || ret.url.includes('127.0.0.1')) {
          ret.url = `${baseUrl}/p/c/${ret.cardId}`;
        }
        ret.edition = ret.edition || (ret.material ? ret.material.toUpperCase() : 'PVC');
        ret.status = ret.state || ret.status;
        ret.state = ret.state || ret.status;
        ret.userId = ret.assignedTo || ret.assignedUser || ret.userId;
        ret.assignedUser = ret.assignedTo || ret.assignedUser || ret.userId;
        ret.assignedTo = ret.assignedTo || ret.assignedUser || ret.userId;
        ret.firstAssignedTo = ret.firstAssignedTo || null;
        ret.everAssigned = Boolean(ret.everAssigned);
        ret.nickname = ret.nickname || ret.label || (ret.metadata ? ret.metadata.label : null);
        return ret;
      },
    },
  },
);

cardSchema.pre('save', function (next) {
  const primaryId = this.cardId || this.cardCode || this.cardUid;
  if (primaryId) {
    this.cardId = primaryId;
    this.cardCode = primaryId;
    this.cardUid = primaryId;
  }
  const baseUrl = (process.env.APP_URL || 'https://one-winq.vercel.app').replace(/\/+$/, '');
  if ((!this.url || this.url.includes('localhost') || this.url.includes('127.0.0.1')) && primaryId) {
    this.url = `${baseUrl}/p/c/${primaryId}`;
  }
  if (this.material && !this.edition) {
    this.edition = this.material.toUpperCase();
  }
  if (this.edition && !this.material) {
    this.material = this.edition.toLowerCase();
  }
  if (this.state && !this.status) {
    this.status = this.state;
  }
  if (this.status && !this.state) {
    this.state = this.status;
  }

  // Synchronize assigned user fields
  const currentAssigned = this.assignedTo || this.assignedUser || this.userId || null;
  this.assignedTo = currentAssigned;
  this.assignedUser = currentAssigned;
  this.userId = currentAssigned;

  if (currentAssigned) {
    if (!this.everAssigned) {
      // First assignment ever: permanently lock the original owner
      this.everAssigned = true;
      this.firstAssignedTo = currentAssigned;
      this.firstAssignedAt = this.firstAssignedAt || new Date();
    } else if (this.firstAssignedTo && String(currentAssigned) !== String(this.firstAssignedTo)) {
      // PERMANENT ASSIGNMENT LOCK: Physical card can ONLY ever belong to the original user
      return next(
        new Error(
          'Permanent card assignment lock: This physical NFC card is permanently linked to its original owner and cannot be reassigned to a different user.'
        )
      );
    }

    if (!this.assignedAt) {
      this.assignedAt = new Date();
    }
  } else {
    // Unassigned state: clear current assigned timestamp
    this.assignedAt = null;
    // Note: everAssigned and firstAssignedTo remain intact and are never cleared!
  }

  if (this.state === CARD_STATE.ACTIVE && !this.activatedAt) {
    this.activatedAt = new Date();
  }

  next();
});

cardSchema.index({ assignedUser: 1, state: 1 });
cardSchema.index({ userId: 1, status: 1 });
cardSchema.index(
  { customSlug: 1 },
  {
    unique: true,
    partialFilterExpression: { customSlug: { $type: 'string' } },
  },
);

export const Card = mongoose.model('Card', cardSchema);
