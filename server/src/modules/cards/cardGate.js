/**
 * cardGate.js
 * Centralised card-activation gate utilities.
 *
 * Card-First Identity rule:
 *   A user's public existence is invisible to the outside world until they own
 *   and have activated a physical OneWinq NFC card.
 *
 * Exports
 *  - hasActiveCard(userId)          → boolean
 *  - filterToCardActive(userIds)    → Set<string> of IDs that have an active card
 */

import mongoose from 'mongoose';
import { Card } from './card.model.js';
import { CARD_STATE } from '../../config/constants.js';

const ACTIVE_CARD_QUERY = {
  $or: [{ state: CARD_STATE.ACTIVE }, { status: CARD_STATE.ACTIVE }],
};

/**
 * Returns true if the given user has at least one active physical card.
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {Promise<boolean>}
 */
export async function hasActiveCard(userId) {
  const id = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
  const card = await Card.findOne({
    $and: [
      { $or: [{ assignedUser: id }, { userId: id }, { assignedTo: id }] },
      ACTIVE_CARD_QUERY,
    ],
  })
    .select('_id')
    .lean();
  return !!card;
}

/**
 * Given an array of user IDs, returns a Set of those that have an active card.
 * Uses a single batched query for efficiency.
 *
 * @param {Array<string|mongoose.Types.ObjectId>} userIds
 * @returns {Promise<Set<string>>}  — contains string IDs only
 */
export async function filterToCardActive(userIds) {
  if (!userIds || userIds.length === 0) return new Set();

  const objIds = userIds.map((id) =>
    typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id,
  );

  const cards = await Card.find({
    $and: [
      {
        $or: [
          { assignedUser: { $in: objIds } },
          { userId: { $in: objIds } },
          { assignedTo: { $in: objIds } },
        ],
      },
      ACTIVE_CARD_QUERY,
    ],
  })
    .select('assignedUser userId assignedTo')
    .lean();

  const activeSet = new Set();
  for (const c of cards) {
    if (c.assignedUser) activeSet.add(c.assignedUser.toString());
    if (c.userId) activeSet.add(c.userId.toString());
    if (c.assignedTo) activeSet.add(c.assignedTo.toString());
  }
  return activeSet;
}
