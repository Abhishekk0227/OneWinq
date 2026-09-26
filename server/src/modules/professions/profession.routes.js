import { Router } from 'express';
import {
  getCategoriesController,
  searchProfessionsController,
  createCustomProfessionController,
  adminCreateCategoryController,
  adminUpdateCategoryController,
  adminDeleteCategoryController,
  adminCreateProfessionController,
  adminUpdateProfessionController,
  adminDeleteProfessionController,
} from './profession.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireAdmin } from '../../middleware/authorize.js';
import {
  validate,
  searchProfessionsSchema,
  createCustomProfessionSchema,
  adminCreateCategorySchema,
  adminUpdateCategorySchema,
  adminCreateProfessionSchema,
  adminUpdateProfessionSchema,
} from './profession.validation.js';

const router = Router();

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

// Public / Authenticated catalog endpoints
router.get('/categories', getCategoriesController);
router.get('/', withValidation(searchProfessionsSchema, 'query'), searchProfessionsController);

// Authenticated user custom profession creation
router.post(
  '/custom',
  authenticate,
  withValidation(createCustomProfessionSchema, 'body'),
  createCustomProfessionController,
);

// Admin Category Management
router.post(
  '/categories',
  authenticate,
  requireAdmin,
  withValidation(adminCreateCategorySchema, 'body'),
  adminCreateCategoryController,
);

router.patch(
  '/categories/:id',
  authenticate,
  requireAdmin,
  withValidation(adminUpdateCategorySchema, 'body'),
  adminUpdateCategoryController,
);

router.delete(
  '/categories/:id',
  authenticate,
  requireAdmin,
  adminDeleteCategoryController,
);

// Admin Profession Management
router.post(
  '/',
  authenticate,
  requireAdmin,
  withValidation(adminCreateProfessionSchema, 'body'),
  adminCreateProfessionController,
);

router.patch(
  '/:id',
  authenticate,
  requireAdmin,
  withValidation(adminUpdateProfessionSchema, 'body'),
  adminUpdateProfessionController,
);

router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  adminDeleteProfessionController,
);

export default router;
