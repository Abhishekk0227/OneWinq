import * as professionService from './profession.service.js';
import { sendSuccess } from '../../shared/response.js';

export async function getCategoriesController(_req, res, next) {
  try {
    const categories = await professionService.getCategories();
    return sendSuccess(res, {
      message: 'Categories retrieved successfully.',
      data: { categories },
    });
  } catch (err) {
    return next(err);
  }
}

export async function searchProfessionsController(req, res, next) {
  try {
    const professions = await professionService.searchProfessions(req.query);
    return sendSuccess(res, {
      message: 'Professions retrieved successfully.',
      data: { professions },
    });
  } catch (err) {
    return next(err);
  }
}

export async function createCustomProfessionController(req, res, next) {
  try {
    const profession = await professionService.createCustomProfession({
      name: req.body.name,
      userId: req.user?.id,
    });
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Profession created successfully.',
      data: { profession },
    });
  } catch (err) {
    return next(err);
  }
}

// ---------------------------------------------------------------------------
// Admin Controllers
// ---------------------------------------------------------------------------

export async function adminCreateCategoryController(req, res, next) {
  try {
    const category = await professionService.adminCreateCategory(req.body);
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Category created successfully.',
      data: { category },
    });
  } catch (err) {
    return next(err);
  }
}

export async function adminUpdateCategoryController(req, res, next) {
  try {
    const category = await professionService.adminUpdateCategory(req.params.id, req.body);
    return sendSuccess(res, {
      message: 'Category updated successfully.',
      data: { category },
    });
  } catch (err) {
    return next(err);
  }
}

export async function adminDeleteCategoryController(req, res, next) {
  try {
    const result = await professionService.adminDeleteCategory(req.params.id);
    return sendSuccess(res, {
      message: result.message,
    });
  } catch (err) {
    return next(err);
  }
}

export async function adminCreateProfessionController(req, res, next) {
  try {
    const profession = await professionService.adminCreateProfession(req.body);
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Profession created successfully.',
      data: { profession },
    });
  } catch (err) {
    return next(err);
  }
}

export async function adminUpdateProfessionController(req, res, next) {
  try {
    const profession = await professionService.adminUpdateProfession(req.params.id, req.body);
    return sendSuccess(res, {
      message: 'Profession updated successfully.',
      data: { profession },
    });
  } catch (err) {
    return next(err);
  }
}

export async function adminDeleteProfessionController(req, res, next) {
  try {
    const result = await professionService.adminDeleteProfession(req.params.id);
    return sendSuccess(res, {
      message: result.message,
    });
  } catch (err) {
    return next(err);
  }
}
