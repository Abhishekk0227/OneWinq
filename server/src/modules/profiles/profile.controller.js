import * as profileService from './profile.service.js';
import * as publicResolverService from './publicResolver.service.js';
import { User } from '../users/user.model.js';
import { sendSuccess } from '../../shared/response.js';

export async function getMyProfileController(req, res, next) {
  try {
    const personaId = req.query.personaId || null;
    const profile = await profileService.getOrCreateProfile(req.user.id, personaId);
    const personas = await profileService.listUserPersonas(req.user.id);
    const user = await User.findById(req.user.id).select('displayName username email avatarUrl').lean();
    return sendSuccess(res, {
      message: 'Profile retrieved.',
      data: {
        profile,
        personas,
        identities: [{ customTitle: profile.professionTitle || profile.personaName || 'Professional', isPrimary: true }],
        user,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function listPersonasController(req, res, next) {
  try {
    const personas = await profileService.listUserPersonas(req.user.id);
    return sendSuccess(res, {
      message: 'Personas retrieved.',
      data: { personas },
    });
  } catch (err) {
    return next(err);
  }
}

export async function createPersonaController(req, res, next) {
  try {
    const persona = await profileService.createPersona(req.user.id, req.body);
    return sendSuccess(res, {
      statusCode: 201,
      message: 'New profession persona created.',
      data: { persona },
    });
  } catch (err) {
    return next(err);
  }
}

export async function switchActivePersonaController(req, res, next) {
  try {
    const persona = await profileService.switchActivePersona(req.user.id, req.params.personaId);
    return sendSuccess(res, {
      message: `Active persona switched to ${persona.personaName}.`,
      data: { persona },
    });
  } catch (err) {
    return next(err);
  }
}

export async function deletePersonaController(req, res, next) {
  try {
    const result = await profileService.deletePersona(req.user.id, req.params.personaId);
    return sendSuccess(res, {
      message: result.message,
      data: null,
    });
  } catch (err) {
    return next(err);
  }
}

export async function updateProfileDraftController(req, res, next) {
  try {
    const personaId = req.query.personaId || req.body.personaId || null;
    const profile = await profileService.updateProfileDraft(req.user.id, req.body, personaId);
    const user = await User.findById(req.user.id).select('displayName username email avatarUrl').lean();
    return sendSuccess(res, {
      message: 'Profile draft updated.',
      data: { profile, user },
    });
  } catch (err) {
    return next(err);
  }
}

export async function publishProfileController(req, res, next) {
  try {
    const personaId = req.query.personaId || req.body?.personaId || null;
    const profile = await profileService.publishProfile(req.user.id, personaId);
    return sendSuccess(res, {
      message: 'Profile published successfully.',
      data: { profile },
    });
  } catch (err) {
    return next(err);
  }
}

export async function updateVisibilityController(req, res, next) {
  try {
    const profile = await profileService.updateVisibility(req.user.id, req.body);
    return sendSuccess(res, {
      message: 'Profile visibility updated.',
      data: { profile },
    });
  } catch (err) {
    return next(err);
  }
}

export async function setActiveModeController(req, res, next) {
  try {
    const profile = await profileService.setActiveMode(req.user.id, req.body.mode);
    return sendSuccess(res, {
      message: `Profile mode switched to ${req.body.mode}.`,
      data: { profile },
    });
  } catch (err) {
    return next(err);
  }
}

export async function setTemporaryModeController(req, res, next) {
  try {
    const profile = await profileService.setTemporaryMode(req.user.id, req.body);
    return sendSuccess(res, {
      message: `Temporary mode ${req.body.mode} activated.`,
      data: { profile },
    });
  } catch (err) {
    return next(err);
  }
}

export async function cancelTemporaryModeController(req, res, next) {
  try {
    const profile = await profileService.cancelTemporaryMode(req.user.id);
    return sendSuccess(res, {
      message: 'Temporary mode override cancelled.',
      data: { profile },
    });
  } catch (err) {
    return next(err);
  }
}

export async function previewProfileController(req, res, next) {
  try {
    const mode = req.query.mode || undefined;
    const preview = await profileService.previewProfile(req.user.id, mode);
    return sendSuccess(res, {
      message: `Profile preview for mode: ${preview.effectiveMode}.`,
      data: { preview },
    });
  } catch (err) {
    return next(err);
  }
}

export async function updateProfileTemplateController(req, res, next) {
  try {
    const result = await profileService.updateProfileTemplate(req.user.id, req.body);
    return sendSuccess(res, {
      message: 'Profile template updated successfully.',
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

export async function getProfileRecommendationsController(req, res, next) {
  try {
    const recommendations = await profileService.getProfileRecommendations(req.user.id, {
      templateIdOverride: req.query.templateId,
      templateSlugOverride: req.query.templateSlug,
      personaIdOverride: req.query.personaId,
    });
    return sendSuccess(res, {
      message: 'Profile recommendations retrieved successfully.',
      data: recommendations,
    });
  } catch (err) {
    return next(err);
  }
}

export async function getRecommendedSectionsController(req, res, next) {
  try {
    const recommendations = await profileService.getProfileRecommendations(req.user.id);
    return sendSuccess(res, {
      message: 'Recommended sections retrieved.',
      data: {
        recommendedSections: recommendations.combinedRecommendations,
        ...recommendations,
      },
    });
  } catch (err) {
    return next(err);
  }
}

// ---------------------------------------------------------------------------
// Identities
// ---------------------------------------------------------------------------

export async function getIdentitiesController(req, res, next) {
  try {
    const identities = await profileService.getUserIdentities(req.user.id);
    return sendSuccess(res, {
      message: 'Identities retrieved.',
      data: { identities },
    });
  } catch (err) {
    return next(err);
  }
}

export async function createIdentityController(req, res, next) {
  try {
    const identity = await profileService.createIdentity(req.user.id, req.body);
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Professional identity created.',
      data: { identity },
    });
  } catch (err) {
    return next(err);
  }
}

export async function updateIdentityController(req, res, next) {
  try {
    const identity = await profileService.updateIdentity(req.user.id, req.params.id, req.body);
    return sendSuccess(res, {
      message: 'Professional identity updated.',
      data: { identity },
    });
  } catch (err) {
    return next(err);
  }
}

export async function deleteIdentityController(req, res, next) {
  try {
    const result = await profileService.deleteIdentity(req.user.id, req.params.id);
    return sendSuccess(res, {
      message: result.message,
      data: null,
    });
  } catch (err) {
    return next(err);
  }
}

// ---------------------------------------------------------------------------
// Username Change
// ---------------------------------------------------------------------------

export async function changeUsernameController(req, res, next) {
  try {
    const result = await profileService.changeUsername(req.user.id, req.body.username);
    return sendSuccess(res, {
      message: result.message,
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

// ---------------------------------------------------------------------------
// Public Resolver
// ---------------------------------------------------------------------------

export async function resolvePublicProfileController(req, res, next) {
  try {
    const username = req.params.username;
    const context = {
      viewerId: req.user?.id || null,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };
    const profileData = await publicResolverService.resolvePublicProfile(username, context);
    return sendSuccess(res, {
      message: 'Profile retrieved successfully.',
      data: profileData,
    });
  } catch (err) {
    return next(err);
  }
}

// ---------------------------------------------------------------------------
// Card-Code Public Resolver — GET /api/v1/public/p/c/:cardCode
// ---------------------------------------------------------------------------

export async function resolveProfileByCardController(req, res, next) {
  try {
    const cardCode = req.params.cardCode;
    const context = {
      viewerId: req.user?.id || null,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };
    const profileData = await publicResolverService.resolveProfileByCardCode(cardCode, context);
    return sendSuccess(res, {
      message: 'Profile retrieved successfully.',
      data: profileData,
    });
  } catch (err) {
    return next(err);
  }
}
