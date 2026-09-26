import mongoose from 'mongoose';
import { Card } from './card.model.js';

const { Schema } = mongoose;

const cardCounterSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    seq: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const CardCounter = mongoose.model('CardCounter', cardCounterSchema);

/**
 * Atomically reserves a block of sequential card sequence numbers.
 * Format: OWQ-CARD-000001, OWQ-CARD-000002, ...
 *
 * @param {number} count Number of sequential IDs to reserve
 * @returns {Promise<{ startSeq: number, endSeq: number }>}
 */
export async function getNextCardSequenceBlock(count = 1) {
  // Always inspect existing cards to ensure counter never falls behind
  const cards = await Card.find({
    $or: [
      { cardCode: /^OWQ-CARD-(\d+)$/i },
      { cardUid: /^OWQ-CARD-(\d+)$/i },
      { cardId: /^OWQ-CARD-(\d+)$/i },
    ],
  })
    .select('cardCode cardUid cardId')
    .lean();

  let maxSeq = 0;
  for (const c of cards) {
    const code = c.cardCode || c.cardUid || c.cardId || '';
    const match = code.match(/^OWQ-CARD-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10) || 0;
      if (num > maxSeq) maxSeq = num;
    }
  }

  const existingCounter = await CardCounter.findById('cardCode');
  if (!existingCounter || existingCounter.seq < maxSeq) {
    await CardCounter.findOneAndUpdate(
      { _id: 'cardCode' },
      { $set: { seq: maxSeq } },
      { upsert: true }
    );
  }

  const updated = await CardCounter.findOneAndUpdate(
    { _id: 'cardCode' },
    { $inc: { seq: count } },
    { new: true, upsert: true }
  );

  const endSeq = updated.seq;
  const startSeq = endSeq - count + 1;
  return { startSeq, endSeq };
}
