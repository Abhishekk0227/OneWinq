import { cardService } from './card.service.js';
import {
  activateCardSchema,
  updateCardSchema,
  updateCardStateSchema,
  validate,
} from './card.validation.js';
import { successResponse } from '../../shared/response.js';
import { Organization } from '../organizations/organization.model.js';
import { ORGANIZATION_STATUS } from '../../config/constants.js';

export const cardController = {
  /**
   * GET /api/v1/cards/tap/:cardUid
   * Public NFC tap resolution
   */
  async resolveTap(req, res, next) {
    const rawIdentifier = req.params.cardUid || req.params.cardCode;
    try {
      const result = await cardService.resolveTap(rawIdentifier, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      return res.status(200).json(
        successResponse(result, 'Card tap resolved successfully.'),
      );
    } catch (err) {
      // Fallback: If not a physical card, check if identifier is an organization slug
      if (rawIdentifier) {
        try {
          const org = await Organization.findOne({
            slug: String(rawIdentifier).toLowerCase().trim(),
            status: { $ne: ORGANIZATION_STATUS.DEACTIVATED },
          });
          if (org) {
            return res.status(200).json(
              successResponse(
                {
                  isOrganization: true,
                  slug: org.slug,
                  displayName: org.name,
                  redirectUrl: `/c/${org.slug}`,
                  organization: org.toSafeObject(),
                },
                'Organization showcase resolved successfully.',
              ),
            );
          }
        } catch {
          // Ignore and continue to next(err)
        }
      }
      return next(err);
    }
  },

  /**
   * GET /api/v1/cards/scan/:cardUid
   * Public QR scan resolution
   */
  async resolveScan(req, res, next) {
    try {
      const result = await cardService.resolveScan(req.params.cardUid || req.params.cardCode, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      return res.status(200).json(
        successResponse(result, 'Card QR scan resolved successfully.'),
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * POST /api/v1/cards/activate
   */
  async activateCard(req, res, next) {
    try {
      const validated = validate(activateCardSchema, req.body);
      const result = await cardService.activateCard({
        userId: req.user.id,
        ...validated,
      });
      return res.status(200).json(
        successResponse(result, 'Card claimed and activated successfully.'),
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * GET /api/v1/cards
   */
  async listCards(req, res, next) {
    try {
      const cards = await cardService.listUserCards(req.user.id);
      return res.status(200).json(
        successResponse({ cards }, 'Cards retrieved successfully.'),
      );
    } catch (err) {
      return next(err);
    }
  },



  /**
   * GET /api/v1/cards/:cardUid
   */
  async getCardDetails(req, res, next) {
    try {
      const card = await cardService.getCardDetails(
        req.user.id,
        req.params.cardUid || req.params.cardCode,
      );
      return res.status(200).json(
        successResponse({ card }, 'Card details retrieved successfully.'),
      );
    } catch (err) {
      return next(err);
    }
  },



  /**
   * PATCH /api/v1/cards/:cardUid
   */
  async updateCardSettings(req, res, next) {
    try {
      const validated = validate(updateCardSchema, req.body);
      const updated = await cardService.updateCardSettings(
        req.user.id,
        req.params.cardUid || req.params.cardCode,
        validated,
      );
      return res.status(200).json(
        successResponse({ card: updated }, 'Card settings updated successfully.'),
      );
    } catch (err) {
      return next(err);
    }
  },

  /**
   * PATCH /api/v1/cards/:cardUid/state
   */
  async updateCardState(req, res, next) {
    try {
      const validated = validate(updateCardStateSchema, req.body);
      const updated = await cardService.updateCardState(
        req.user.id,
        req.params.cardUid || req.params.cardCode,
        validated.state,
      );
      return res.status(200).json(
        successResponse({ card: updated }, `Card state updated to ${validated.state}.`),
      );
    } catch (err) {
      return next(err);
    }
  },
};
