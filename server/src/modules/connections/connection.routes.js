import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { connectionRateLimiter } from '../../middleware/rateLimiter.js';
import {
  sendRequestController,
  acceptRequestController,
  rejectRequestController,
  withdrawRequestController,
  removeConnectionController,
  blockUserController,
  unblockUserController,
  getConnectionsController,
  getPendingRequestsController,
  getBlockedUsersController,
  getMutualConnectionsController,
} from './connection.controller.js';
import {
  validate,
  sendRequestSchema,
  connectionQuerySchema,
  pendingQuerySchema,
} from './connection.validation.js';

function withValidation(schema, source = 'body') {
  return (req, _res, next) => {
    try {
      const validated = validate(schema, req[source]);
      if (source === 'query') {
        Object.defineProperty(req, 'query', {
          value: validated,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      } else {
        req[source] = validated;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

const router = Router();

router.use(authenticate);
router.use(connectionRateLimiter);

// GET /api/v1/connections — active connections
router.get('/', withValidation(connectionQuerySchema, 'query'), getConnectionsController);

// GET /api/v1/connections/pending — incoming or outgoing pending requests
router.get('/pending', withValidation(pendingQuerySchema, 'query'), getPendingRequestsController);

// GET /api/v1/connections/blocks — list of users blocked by me
router.get('/blocks', getBlockedUsersController);

// GET /api/v1/connections/mutual/:targetUserId — mutual connections
router.get('/mutual/:targetUserId', getMutualConnectionsController);

// POST /api/v1/connections/request — send connection request
router.post('/request', withValidation(sendRequestSchema, 'body'), sendRequestController);

// POST /api/v1/connections/:id/accept — accept request
router.post('/:id/accept', acceptRequestController);

// POST /api/v1/connections/:id/reject — reject request
router.post('/:id/reject', rejectRequestController);

// POST /api/v1/connections/:id/withdraw — withdraw request
router.post('/:id/withdraw', withdrawRequestController);

// DELETE /api/v1/connections/:targetUserId — disconnect
router.delete('/:targetUserId', removeConnectionController);

// POST /api/v1/connections/block/:targetUserId — block user
router.post('/block/:targetUserId', blockUserController);

// DELETE /api/v1/connections/block/:targetUserId — unblock user
router.delete('/block/:targetUserId', unblockUserController);

export default router;
