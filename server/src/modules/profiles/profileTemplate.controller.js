import { profileTemplateService } from './profileTemplate.service.js';
import { sendSuccess } from '../../shared/response.js';

export async function listTemplatesController(req, res, next) {
  try {
    const templates = await profileTemplateService.listTemplates({
      category: req.query.category || null,
    });
    return sendSuccess(res, {
      message: 'Profile templates retrieved.',
      data: { templates },
    });
  } catch (err) {
    return next(err);
  }
}

export async function getTemplateBySlugController(req, res, next) {
  try {
    const template = await profileTemplateService.getTemplateBySlugOrId(req.params.slug);
    return sendSuccess(res, {
      message: 'Profile template retrieved.',
      data: { template },
    });
  } catch (err) {
    return next(err);
  }
}
