import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../../middleware/authenticate.js';
import {
  getMyProfileController,
  listPersonasController,
  createPersonaController,
  switchActivePersonaController,
  deletePersonaController,
  updateProfileDraftController,
  publishProfileController,
  updateVisibilityController,
  setActiveModeController,
  setTemporaryModeController,
  cancelTemporaryModeController,
  previewProfileController,
  updateProfileTemplateController,
  getProfileRecommendationsController,
  getRecommendedSectionsController,
  getIdentitiesController,
  createIdentityController,
  updateIdentityController,
  deleteIdentityController,
  changeUsernameController,
  resolvePublicProfileController,
  resolveProfileByCardController,
} from './profile.controller.js';
import {
  validate,
  updateProfileSchema,
  updateVisibilitySchema,
  updateProfileTemplateSchema,
  setModeSchema,
  setTemporaryModeSchema,
  changeUsernameSchema,
  createIdentitySchema,
  updateIdentitySchema,
} from './profile.validation.js';

function withValidation(schema, source = 'body') {
  return (req, _res, next) => {
    try {
      req[source] = validate(schema, req[source]);
      next();
    } catch (err) {
      next(err);
    }
  };
}

// ---------------------------------------------------------------------------
// Authenticated Profile Routes — /api/v1/profiles
// ---------------------------------------------------------------------------

const profileRouter = Router();

profileRouter.use(authenticate);

profileRouter.get('/me', getMyProfileController);
profileRouter.put('/me', withValidation(updateProfileSchema), updateProfileDraftController);
profileRouter.post('/me/publish', publishProfileController);

// Personas
profileRouter.get('/me/personas', listPersonasController);
profileRouter.post('/me/personas', createPersonaController);
profileRouter.post('/me/personas/:personaId/activate', switchActivePersonaController);
profileRouter.delete('/me/personas/:personaId', deletePersonaController);

profileRouter.put('/me/visibility', withValidation(updateVisibilitySchema), updateVisibilityController);
profileRouter.post('/me/mode', withValidation(setModeSchema), setActiveModeController);
profileRouter.post('/me/mode/temporary', withValidation(setTemporaryModeSchema), setTemporaryModeController);
profileRouter.delete('/me/mode/temporary', cancelTemporaryModeController);
profileRouter.get('/me/preview', previewProfileController);
profileRouter.patch('/me/template', withValidation(updateProfileTemplateSchema), updateProfileTemplateController);
profileRouter.get('/me/recommendations', getProfileRecommendationsController);
profileRouter.get('/me/recommended-sections', getRecommendedSectionsController);
profileRouter.post('/me/username', withValidation(changeUsernameSchema), changeUsernameController);

// Identities
profileRouter.get('/me/identities', getIdentitiesController);
profileRouter.post('/me/identities', withValidation(createIdentitySchema), createIdentityController);
profileRouter.put('/me/identities/:id', withValidation(updateIdentitySchema), updateIdentityController);
profileRouter.delete('/me/identities/:id', deleteIdentityController);

// ---------------------------------------------------------------------------
// Public Profile Routes — /api/v1/public
// ---------------------------------------------------------------------------

export const publicProfileRouter = Router();

// GET /api/v1/public/u/:username — resolve profile by username
publicProfileRouter.get('/u/:username', optionalAuthenticate, resolvePublicProfileController);

// GET /api/v1/public/p/c/:cardCode — resolve profile by physical card code (card-first identity URL)
publicProfileRouter.get('/p/c/:cardCode', optionalAuthenticate, resolveProfileByCardController);

export default profileRouter;
