import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { getCanonicalUserPair, Connection } from '../../../src/modules/connections/connection.model.js';

describe('Canonical Pair and Relative State', () => {
  describe('getCanonicalUserPair', () => {
    it('orders two user IDs deterministically', () => {
      const id1 = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
      const id2 = new mongoose.Types.ObjectId('507f1f77bcf86cd799439022');

      const pair1 = getCanonicalUserPair(id1, id2);
      expect(pair1.userLow.toString()).toBe(id1.toString());
      expect(pair1.userHigh.toString()).toBe(id2.toString());
      expect(pair1.isSwapped).toBe(false);

      // Reversed input produces exact same low/high
      const pair2 = getCanonicalUserPair(id2, id1);
      expect(pair2.userLow.toString()).toBe(id1.toString());
      expect(pair2.userHigh.toString()).toBe(id2.toString());
      expect(pair2.isSwapped).toBe(true);
    });

    it('throws when attempting to create a pair with oneself', () => {
      const id = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
      expect(() => getCanonicalUserPair(id, id)).toThrow('Cannot create a connection with oneself');
    });
  });

  describe('Connection.prototype.getRelativeState', () => {
    const userA = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
    const userB = new mongoose.Types.ObjectId('507f1f77bcf86cd799439022');

    it('identifies PENDING_SENT vs PENDING_RECEIVED', () => {
      const conn = new Connection({
        userLow: userA,
        userHigh: userB,
        state: 'PENDING',
        actionBy: userA,
      });

      expect(conn.getRelativeState(userA)).toBe('PENDING_SENT');
      expect(conn.getRelativeState(userB)).toBe('PENDING_RECEIVED');
    });

    it('identifies BLOCKED_BY_ME vs BLOCKED_BY_OTHER', () => {
      const conn = new Connection({
        userLow: userA,
        userHigh: userB,
        state: 'BLOCKED',
        actionBy: userB,
      });

      expect(conn.getRelativeState(userB)).toBe('BLOCKED_BY_ME');
      expect(conn.getRelativeState(userA)).toBe('BLOCKED_BY_OTHER');
    });

    it('returns CONNECTED for both participants when connected', () => {
      const conn = new Connection({
        userLow: userA,
        userHigh: userB,
        state: 'CONNECTED',
        actionBy: userA,
      });

      expect(conn.getRelativeState(userA)).toBe('CONNECTED');
      expect(conn.getRelativeState(userB)).toBe('CONNECTED');
    });
  });
});
