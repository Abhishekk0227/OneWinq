import { Router } from 'express';
import {
  listTemplatesController,
  getTemplateBySlugController,
} from './profileTemplate.controller.js';

export const profileTemplateRouter = Router();

// GET /api/v1/profile-templates
profileTemplateRouter.get('/', listTemplatesController);

// GET /api/v1/profile-templates/:slug
profileTemplateRouter.get('/:slug', getTemplateBySlugController);

export default profileTemplateRouter;
