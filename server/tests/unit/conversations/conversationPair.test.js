import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import {
  getCanonicalConversationPair,
  Conversation,
} from '../../../src/modules/conversations/conversation.model.js';
import { Message } from '../../../src/modules/conversations/message.model.js';

describe('Conversation Models and Helpers', () => {
  describe('getCanonicalConversationPair', () => {
    it('orders two user IDs deterministically', () => {
      const id1 = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
      const id2 = new mongoose.Types.ObjectId('507f1f77bcf86cd799439022');

      const pair1 = getCanonicalConversationPair(id1, id2);
      expect(pair1.userLow.toString()).toBe(id1.toString());
      expect(pair1.userHigh.toString()).toBe(id2.toString());

      const pair2 = getCanonicalConversationPair(id2, id1);
      expect(pair2.userLow.toString()).toBe(id1.toString());
      expect(pair2.userHigh.toString()).toBe(id2.toString());
    });

    it('throws when attempting to create a conversation with oneself', () => {
      const id = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
      expect(() => getCanonicalConversationPair(id, id)).toThrow('Cannot create a conversation with oneself');
    });
  });

  describe('Conversation.prototype methods', () => {
    const userA = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
    const userB = new mongoose.Types.ObjectId('507f1f77bcf86cd799439022');

    it('resolves the other user ID accurately', () => {
      const conv = new Conversation({ userLow: userA, userHigh: userB });
      expect(conv.getOtherUserId(userA).toString()).toBe(userB.toString());
      expect(conv.getOtherUserId(userB).toString()).toBe(userA.toString());
    });

    it('checks if deleted for a specific user', () => {
      const conv = new Conversation({
        userLow: userA,
        userHigh: userB,
        deletedBy: [userA],
      });

      expect(conv.isDeletedFor(userA)).toBe(true);
      expect(conv.isDeletedFor(userB)).toBe(false);
    });
  });

  describe('Message.prototype.toClientObject', () => {
    const convId = new mongoose.Types.ObjectId();
    const sender = new mongoose.Types.ObjectId();
    const recipient = new mongoose.Types.ObjectId();

    it('formats a normal message with text and attachments', () => {
      const msg = new Message({
        conversationId: convId,
        senderId: sender,
        recipientId: recipient,
        text: 'Hello world',
        attachments: [{ url: 'https://example.com/doc.pdf', filename: 'doc.pdf' }],
      });

      const formatted = msg.toClientObject();
      expect(formatted.text).toBe('Hello world');
      expect(formatted.attachments).toHaveLength(1);
      expect(formatted.isDeletedForEveryone).toBe(false);
    });

    it('replaces text with placeholder when deleted for everyone', () => {
      const msg = new Message({
        conversationId: convId,
        senderId: sender,
        recipientId: recipient,
        text: 'Sensitive information',
        attachments: [{ url: 'https://example.com/secret.pdf' }],
        isDeletedForEveryone: true,
      });

      const formatted = msg.toClientObject();
      expect(formatted.text).toBe('This message was deleted');
      expect(formatted.attachments).toHaveLength(0);
      expect(formatted.isDeletedForEveryone).toBe(true);
    });
  });
});
