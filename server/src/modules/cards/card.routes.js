import { Router } from 'express';
import { cardController } from './card.controller.js';
import { authenticate } from '../../middleware/authenticate.js';

export const cardRoutes = Router();

// Public tap and scan resolution endpoints
cardRoutes.get('/tap/:cardUid', cardController.resolveTap);
cardRoutes.get('/scan/:cardUid', cardController.resolveScan);

// Authenticated card management
cardRoutes.post('/activate', authenticate, cardController.activateCard);
cardRoutes.get('/', authenticate, cardController.listCards);

// Card-specific endpoints
cardRoutes.get('/:cardUid', authenticate, cardController.getCardDetails);
cardRoutes.patch('/:cardUid', authenticate, cardController.updateCardSettings);
cardRoutes.patch('/:cardUid/state', authenticate, cardController.updateCardState);
