import { Router } from 'express';
import { optionalAuthenticate } from '../../middleware/authenticate.js';
import { searchRateLimiter } from '../../middleware/rateLimiter.js';
import { searchDiscoveryController } from './discovery.controller.js';
import { validate, discoverySearchSchema } from './discovery.validation.js';

function withValidation(schema, source = 'query') {
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

// GET /api/v1/discovery/search
router.get(
  '/search',
  searchRateLimiter,
  optionalAuthenticate,
  withValidation(discoverySearchSchema, 'query'),
  searchDiscoveryController,
);

export default router;
