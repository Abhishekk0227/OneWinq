import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cardService } from '../../../src/modules/cards/card.service.js';
import { Card } from '../../../src/modules/cards/card.model.js';
import { User } from '../../../src/modules/users/user.model.js';
import { CARD_STATE } from '../../../src/config/constants.js';
import * as passwordService from '../../../src/modules/auth/passwordService.js';
import { notificationService } from '../../../src/modules/notifications/notification.service.js';

describe('Card Service & Model — Permanent Assignment Lock & Lifecycle Logic', () => {
  const userIdA = '60c72b2f9b1d8b2bad000001';
  const userIdB = '60c72b2f9b1d8b2bad000002';
  const cardCode = 'OWQ-PVC-0009482';

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(notificationService, 'createNotification').mockResolvedValue({});
  });

  describe('activateCard', () => {
    it('successfully activates card and sets permanent owner fields', async () => {
      const mockCard = {
        cardCode,
        cardUid: cardCode,
        secretHash: 'hashed_secret',
        state: CARD_STATE.UNASSIGNED,
        assignedUser: null,
        everAssigned: false,
        firstAssignedTo: null,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(Card, 'findOne').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockCard),
      });
      vi.spyOn(passwordService, 'verifyPassword').mockResolvedValue(true);

      const result = await cardService.activateCard({
        userId: userIdA,
        cardCode,
        activationCode: '583921',
        nickname: 'My Card',
      });

      expect(result.cardCode).toBe(cardCode);
      expect(result.state).toBe(CARD_STATE.ACTIVE);
      expect(result.assignedUser).toBe(userIdA);
      expect(result.everAssigned).toBe(true);
      expect(result.firstAssignedTo).toBe(userIdA);
      expect(mockCard.assignedUser).toBe(userIdA);
      expect(mockCard.everAssigned).toBe(true);
      expect(mockCard.firstAssignedTo).toBe(userIdA);
      expect(mockCard.save).toHaveBeenCalled();
    });

    it('rejects activation if invalid activation code', async () => {
      const mockCard = {
        cardCode,
        secretHash: 'hashed_secret',
        state: CARD_STATE.UNASSIGNED,
        assignedUser: null,
      };

      vi.spyOn(Card, 'findOne').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockCard),
      });
      vi.spyOn(passwordService, 'verifyPassword').mockResolvedValue(false);

      await expect(
        cardService.activateCard({
          userId: userIdA,
          cardCode,
          activationCode: 'wrong_code',
        }),
      ).rejects.toThrow('Invalid activation code for this card');
    });

    it('rejects activation if a different user attempts to activate an already assigned card', async () => {
      const mockCard = {
        cardCode,
        secretHash: 'hashed_secret',
        state: CARD_STATE.INACTIVE,
        assignedUser: userIdA,
        everAssigned: true,
        firstAssignedTo: userIdA,
        save: vi.fn(),
      };

      vi.spyOn(Card, 'findOne').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockCard),
      });
      vi.spyOn(passwordService, 'verifyPassword').mockResolvedValue(true);

      await expect(
        cardService.activateCard({
          userId: userIdB,
          cardCode,
          activationCode: '583921',
        }),
      ).rejects.toThrow('permanently linked to its original owner');
    });
  });

  describe('resolveTap — Cumulative Analytics', () => {
    it('preserves cumulative tapCount during public card resolution', async () => {
      const mockUser = {
        _id: userIdA,
        username: 'kundan',
        displayName: 'Kundan Mehta',
        accountState: 'ACTIVE',
      };

      const mockCard = {
        cardCode,
        cardUid: cardCode,
        cardId: cardCode,
        url: `https://onewinq.com/p/c/${cardCode}`,
        state: CARD_STATE.ACTIVE,
        status: CARD_STATE.ACTIVE,
        assignedUser: userIdA,
        tapCount: 42,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(Card, 'findOne').mockResolvedValue(mockCard);
      vi.spyOn(User, 'findById').mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockUser),
        }),
      });

      const res = await cardService.resolveTap(cardCode, { ip: '127.0.0.1' });
      expect(res.username).toBe('kundan');
      expect(mockCard.tapCount).toBe(43);
      expect(mockCard.save).toHaveBeenCalled();
    });
  });
});
