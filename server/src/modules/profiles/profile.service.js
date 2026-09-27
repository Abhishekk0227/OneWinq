import { randomUUID } from 'crypto';
import { Profile } from './profile.model.js';
import { ProfessionalIdentity } from './professionalIdentity.model.js';
import { UsernameHistory } from './usernameHistory.model.js';
import { isUsernameReserved } from './reservedUsername.model.js';
import { User } from '../users/user.model.js';
import { Card } from '../cards/card.model.js';
import { filterProfileByVisibility } from './visibilityResolver.js';
import { getRecommendationsForProfessions } from '../professions/profession.service.js';
import { ProfileTemplate } from './profileTemplate.model.js';
import { profileTemplateService } from './profileTemplate.service.js';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  AppError,
} from '../../shared/errors.js';
import {
  PROFILE_STATE,
  VISIBILITY_MODE,
  ERROR_CODE,
  USERNAME,
} from '../../config/constants.js';
import logger from '../../utils/logger.js';

let legacyUniqueIndexChecked = false;
export async function dropLegacyUserIdUniqueIndex() {
  if (legacyUniqueIndexChecked) return;
  try {
    const indexes = await Profile.collection.indexes();
    const legacyIndex = indexes.find(
      (idx) => (idx.name === 'userId_1' || (idx.key && idx.key.userId === 1 && Object.keys(idx.key).length === 1)) && idx.unique
    );
    if (legacyIndex) {
      await Profile.collection.dropIndex(legacyIndex.name);
      logger.info(`Dropped legacy unique index "${legacyIndex.name}" from profiles collection`);
    }
    legacyUniqueIndexChecked = true;
  } catch {
    // Collection or index might not exist yet
  }
}

// Ensure entries have a stable UUID
function ensureEntryIds(entries = []) {
  if (!Array.isArray(entries)) {return [];}
  return entries.map((e) => ({
    ...e,
    id: e.id || randomUUID(),
  }));
}

/**
 * Get or automatically create the profile/persona for a user.
 */
export async function getOrCreateProfile(userId, personaId = null) {
  let profile = null;
  if (personaId) {
    profile = await Profile.findOne({ _id: personaId, userId }).populate('templateId');
  } else {
    profile = await Profile.findOne({ userId, isActive: true }).populate('templateId');
  }

  // Fallback to any existing profile for user if none has isActive: true
  if (!profile) {
    profile = await Profile.findOne({ userId }).populate('templateId');
    if (profile) {
      profile.isActive = true;
      await profile.save();
    }
  }

  if (!profile) {
    let defaultTemplate = null;
    try {
      defaultTemplate = await profileTemplateService.getDefaultTemplate();
    } catch {
      // Safe fallback if templates not seeded yet
    }

    profile = await Profile.create({
      userId,
      personaName: defaultTemplate ? defaultTemplate.name : 'Professional',
      professionTitle: defaultTemplate ? defaultTemplate.name : 'Professional',
      templateSlug: defaultTemplate ? defaultTemplate.slug : 'professional',
      templateId: defaultTemplate ? defaultTemplate._id : null,
      isActive: true,
      state: PROFILE_STATE.DRAFT,
      activeMode: VISIBILITY_MODE.PUBLIC,
    });
    if (defaultTemplate) {
      profile.templateId = defaultTemplate;
    }
  } else if (!profile.templateId) {
    try {
      const defaultTemplate = await profileTemplateService.getDefaultTemplate();
      if (defaultTemplate) {
        profile.templateId = defaultTemplate._id;
        profile.templateSlug = defaultTemplate.slug;
        await profile.save();
        profile.templateId = defaultTemplate;
      }
    } catch {
      // Safe fallback
    }
  }
  return profile;
}

/**
 * List all saved personas for a user.
 */
export async function listUserPersonas(userId) {
  await getOrCreateProfile(userId);
  const personas = await Profile.find({ userId })
    .populate('templateId')
    .sort({ isActive: -1, createdAt: 1 })
    .lean();

  return personas.map((p) => ({
    id: p._id.toString(),
    _id: p._id.toString(),
    personaName: p.personaName || p.templateId?.name || 'Profile',
    professionTitle: p.professionTitle || p.headline || '',
    templateSlug: p.templateSlug || p.templateId?.slug || 'professional',
    template: p.templateId || null,
    isActive: Boolean(p.isActive),
    state: p.state,
    headline: p.headline,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));
}

/**
 * Create a new persona profile for a user.
 */
export async function createPersona(userId, { personaName, professionTitle, templateSlug = 'professional', copyFromActive = true } = {}) {
  let template = null;
  if (templateSlug) {
    template = await ProfileTemplate.findOne({ slug: templateSlug.toLowerCase().trim() });
  }
  if (!template) {
    template = (await ProfileTemplate.findOne({ isDefault: true })) || (await ProfileTemplate.findOne());
  }

  const activePersona = await getOrCreateProfile(userId);

  const resolvedSlug = template ? template.slug : templateSlug || 'professional';
  const resolvedName = (personaName || professionTitle || template?.name || 'New Profile').trim();
  const resolvedTitle = (professionTitle || personaName || template?.name || '').trim();

  const newPersona = new Profile({
    userId,
    personaName: resolvedName,
    professionTitle: resolvedTitle,
    templateSlug: resolvedSlug,
    templateId: template ? template._id : null,
    isActive: false,
    state: PROFILE_STATE.DRAFT,
    activeMode: VISIBILITY_MODE.PUBLIC,
    headline: resolvedTitle,
    contact: copyFromActive && activePersona.contact ? activePersona.contact.toObject() : {},
    location: copyFromActive && activePersona.location ? activePersona.location.toObject() : {},
    socialLinks: copyFromActive && activePersona.socialLinks ? activePersona.socialLinks.map((s) => s.toObject()) : [],
  });

  await dropLegacyUserIdUniqueIndex();

  try {
    await newPersona.save();
  } catch (err) {
    if (err.code === 11000 && (err.message?.includes('userId') || err.keyPattern?.userId)) {
      try {
        await Profile.collection.dropIndex('userId_1');
      } catch {}
      await newPersona.save();
    } else {
      throw err;
    }
  }

  if (template) {
    newPersona.templateId = template;
  }
  return newPersona;
}

/**
 * Switch the active persona for a user.
 */
export async function switchActivePersona(userId, personaId) {
  const targetPersona = await Profile.findOne({ _id: personaId, userId }).populate('templateId');
  if (!targetPersona) {
    throw new NotFoundError('Persona profile not found');
  }

  await Profile.updateMany({ userId }, { $set: { isActive: false } });

  targetPersona.isActive = true;
  await targetPersona.save();

  return targetPersona;
}

/**
 * Delete a persona profile.
 */
export async function deletePersona(userId, personaId) {
  const allPersonas = await Profile.find({ userId });
  if (allPersonas.length <= 1) {
    throw new AppError('Cannot delete your only profile persona.', ERROR_CODE.BAD_REQUEST, 400);
  }

  const target = allPersonas.find((p) => p._id.toString() === personaId.toString());
  if (!target) {
    throw new NotFoundError('Persona profile not found');
  }

  await Profile.deleteOne({ _id: target._id });

  if (target.isActive) {
    const nextActive = await Profile.findOne({ userId }).sort({ createdAt: 1 });
    if (nextActive) {
      nextActive.isActive = true;
      await nextActive.save();
    }
  }

  return { message: 'Persona profile deleted successfully.' };
}

/**
 * Update the working draft of a profile persona.
 */
export async function updateProfileDraft(userId, data, personaId = null) {
  const targetId = personaId || data.personaId || null;
  const currentProfile = await getOrCreateProfile(userId, targetId);

  if (data.displayName !== undefined && data.displayName.trim()) {
    await User.findByIdAndUpdate(userId, { displayName: data.displayName.trim() });
  }
  if (data.avatarUrl !== undefined) {
    await User.findByIdAndUpdate(userId, { avatarUrl: data.avatarUrl || null });
  }

  const updates = {};

  if (data.personaName !== undefined) { updates.personaName = data.personaName.trim(); }
  if (data.professionTitle !== undefined) { updates.professionTitle = data.professionTitle.trim(); }
  if (data.templateSlug !== undefined) { updates.templateSlug = data.templateSlug.trim().toLowerCase(); }
  if (data.templateId !== undefined) { updates.templateId = data.templateId; }

  if (data.headline !== undefined) { updates.headline = data.headline; }
  if (data.bio !== undefined) { updates.bio = data.bio; }
  if (data.avatarUrl !== undefined) { updates.avatarUrl = data.avatarUrl; }
  if (data.coverUrl !== undefined) { updates.coverUrl = data.coverUrl; }
  if (data.location !== undefined) { updates.location = data.location; }
  if (data.contact !== undefined) { updates.contact = data.contact; }

  if (data.socialLinks !== undefined) {
    updates.socialLinks = ensureEntryIds(data.socialLinks);
  }
  if (data.education !== undefined) {
    updates.education = ensureEntryIds(data.education);
  }
  if (data.experience !== undefined) {
    updates.experience = ensureEntryIds(data.experience);
  }
  if (data.skills !== undefined) {
    updates.skills = ensureEntryIds(data.skills);
  }
  if (data.projects !== undefined) {
    updates.projects = ensureEntryIds(data.projects);
  }
  if (data.certifications !== undefined) {
    updates.certifications = ensureEntryIds(data.certifications);
  }
  if (data.services !== undefined) {
    updates.services = ensureEntryIds(data.services);
  }
  if (data.awards !== undefined) {
    updates.awards = ensureEntryIds(data.awards);
  }
  if (data.publications !== undefined) {
    updates.publications = ensureEntryIds(data.publications);
  }
  if (data.achievements !== undefined) {
    updates.achievements = ensureEntryIds(data.achievements);
  }
  if (data.mediaGallery !== undefined) {
    updates.mediaGallery = ensureEntryIds(data.mediaGallery);
  }
  if (data.blogs !== undefined) {
    updates.blogs = ensureEntryIds(data.blogs);
  }
  if (data.research !== undefined) {
    updates.research = ensureEntryIds(data.research);
  }
  if (data.courses !== undefined) {
    updates.courses = ensureEntryIds(data.courses);
  }
  if (data.speaking !== undefined) {
    updates.speaking = ensureEntryIds(data.speaking);
  }
  if (data.organizations !== undefined) {
    updates.organizations = ensureEntryIds(data.organizations);
  }
  if (data.teaching !== undefined) {
    updates.teaching = ensureEntryIds(data.teaching);
  }
  if (data.customSections !== undefined) {
    updates.customSections = ensureEntryIds(data.customSections);
  }
  if (data.sectionOrder !== undefined) {
    updates.sectionOrder = data.sectionOrder;
  }

  const updated = await Profile.findOneAndUpdate(
    { _id: currentProfile._id, userId },
    { $set: updates },
    { new: true, runValidators: true },
  ).populate('templateId');

  if (updated && updated.state === PROFILE_STATE.PUBLISHED) {
    return await publishProfile(userId, updated._id);
  }

  return updated;
}

/**
 * Promote the current draft to the published state.
 *
 * CARD-FIRST GATE: The user must have at least one active physical OneWinq card
 * before their profile can be published and made publicly accessible.
 */
export async function publishProfile(userId, personaId = null) {
  // Enforce card-first identity rule
  const activeCard = await Card.findOne({
    $and: [
      {
        $or: [
          { assignedUser: userId },
          { userId },
          { assignedTo: userId },
        ],
      },
      {
        $or: [
          { state: 'ACTIVE' },
          { status: 'ACTIVE' },
        ],
      },
    ],
  }).select('cardCode cardUid cardId').lean();

  if (!activeCard) {
    throw new AppError(
      'A physical OneWinq card must be activated before your profile can be published. Order and activate your card to unlock your public identity.',
      ERROR_CODE.FORBIDDEN,
      403,
    );
  }

  const profile = await getOrCreateProfile(userId, personaId);

  // Take a clean JSON snapshot of the persona profile
  const snapshot = {
    personaName: profile.personaName,
    professionTitle: profile.professionTitle,
    templateSlug: profile.templateSlug || profile.templateId?.slug || 'professional',
    templateId: profile.templateId?._id || profile.templateId,
    headline: profile.headline,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    avatarVisibility: profile.avatarVisibility,
    coverUrl: profile.coverUrl,
    location: profile.location ? profile.location.toObject() : {},
    contact: profile.contact ? profile.contact.toObject() : {},
    socialLinks: profile.socialLinks.map((s) => s.toObject()),
    education: profile.education.map((s) => s.toObject()),
    experience: profile.experience.map((s) => s.toObject()),
    skills: profile.skills.map((s) => s.toObject()),
    projects: profile.projects.map((s) => s.toObject()),
    certifications: profile.certifications.map((s) => s.toObject()),
    services: profile.services.map((s) => s.toObject()),
    awards: profile.awards.map((s) => s.toObject()),
    publications: profile.publications.map((s) => s.toObject()),
    achievements: (profile.achievements || []).map((s) => s.toObject()),
    mediaGallery: (profile.mediaGallery || []).map((s) => s.toObject()),
    blogs: (profile.blogs || []).map((s) => s.toObject()),
    research: (profile.research || []).map((s) => s.toObject()),
    courses: (profile.courses || []).map((s) => s.toObject()),
    speaking: (profile.speaking || []).map((s) => s.toObject()),
    organizations: (profile.organizations || []).map((s) => s.toObject()),
    teaching: (profile.teaching || []).map((s) => s.toObject()),
    customSections: profile.customSections.map((s) => s.toObject()),
    sectionVisibility: Object.fromEntries(profile.sectionVisibility),
    fieldVisibility: profile.fieldVisibility instanceof Map
      ? Object.fromEntries(profile.fieldVisibility)
      : (profile.fieldVisibility || {}),
    sectionOrder: profile.sectionOrder,
    activeMode: profile.activeMode,
    temporaryMode: profile.temporaryMode ? profile.temporaryMode.toObject() : null,
  };

  // Store the card code that unlocked this identity
  const cardCode = activeCard.cardCode || activeCard.cardUid || activeCard.cardId;
  profile.publishedData = snapshot;
  profile.state = PROFILE_STATE.PUBLISHED;
  profile.publishedAt = new Date();
  if (cardCode && !profile.linkedCardCode) {
    profile.linkedCardCode = cardCode.toUpperCase();
  }

  await profile.save();

  if (profile.avatarUrl) {
    await User.findByIdAndUpdate(userId, { avatarUrl: profile.avatarUrl });
  }

  logger.info('Profile published (card-gated)', { userId, cardCode: profile.linkedCardCode });

  return profile;
}

/**
 * Update section and field visibility maps.
 */
export async function updateVisibility(userId, { avatarVisibility, sectionVisibility, fieldVisibility }) {
  const profile = await getOrCreateProfile(userId);

  if (avatarVisibility) {
    profile.avatarVisibility = avatarVisibility;
  }

  if (sectionVisibility && typeof sectionVisibility === 'object') {
    for (const [k, v] of Object.entries(sectionVisibility)) {
      profile.sectionVisibility.set(k, v);
    }
  }

  if (fieldVisibility && typeof fieldVisibility === 'object') {
    if (profile.fieldVisibility instanceof Map) {
      for (const [k, v] of Object.entries(fieldVisibility)) {
        profile.fieldVisibility.set(k, v);
      }
    } else {
      profile.fieldVisibility = {
        ...(profile.fieldVisibility || {}),
        ...fieldVisibility,
      };
      profile.markModified('fieldVisibility');
    }
  }

  await profile.save();

  // If already published, update visibility in published snapshot as well
  if (profile.publishedData) {
    profile.publishedData.avatarVisibility = profile.avatarVisibility;
    profile.publishedData.sectionVisibility = Object.fromEntries(profile.sectionVisibility);
    profile.publishedData.fieldVisibility = profile.fieldVisibility instanceof Map
      ? Object.fromEntries(profile.fieldVisibility)
      : (profile.fieldVisibility || {});
    profile.markModified('publishedData');
    await profile.save();
  }

  return profile;
}

/**
 * Switch default active presentation mode.
 * Manual mode change cancels any temporary mode override.
 */
export async function setActiveMode(userId, mode) {
  const profile = await getOrCreateProfile(userId);
  profile.activeMode = mode;
  // Cancels temporary override
  profile.temporaryMode = { mode: null, expiresAt: null, fallbackMode: mode };

  if (profile.publishedData) {
    profile.publishedData.activeMode = mode;
    profile.publishedData.temporaryMode = profile.temporaryMode;
    profile.markModified('publishedData');
  }

  await profile.save();
  return profile;
}

/**
 * Set temporary mode override.
 * Only one temporary override can exist (replaces previous).
 */
export async function setTemporaryMode(userId, { mode, durationHours, expiresAt, fallbackMode }) {
  const profile = await getOrCreateProfile(userId);

  let expiryDate;
  if (expiresAt) {
    expiryDate = new Date(expiresAt);
  } else if (durationHours) {
    expiryDate = new Date(Date.now() + durationHours * 3600 * 1000);
  } else {
    // Default 24 hours
    expiryDate = new Date(Date.now() + 24 * 3600 * 1000);
  }

  profile.temporaryMode = {
    mode,
    expiresAt: expiryDate,
    fallbackMode: fallbackMode || profile.activeMode || VISIBILITY_MODE.PUBLIC,
  };

  if (profile.publishedData) {
    profile.publishedData.temporaryMode = profile.temporaryMode;
    profile.markModified('publishedData');
  }

  await profile.save();
  return profile;
}

/**
 * Cancel temporary mode override.
 */
export async function cancelTemporaryMode(userId) {
  const profile = await getOrCreateProfile(userId);
  profile.temporaryMode = {
    mode: null,
    expiresAt: null,
    fallbackMode: profile.activeMode || VISIBILITY_MODE.PUBLIC,
  };

  if (profile.publishedData) {
    profile.publishedData.temporaryMode = profile.temporaryMode;
    profile.markModified('publishedData');
  }

  await profile.save();
  return profile;
}

/**
 * Preview profile as seen in a given visibility mode.
 */
export async function previewProfile(userId, mode = VISIBILITY_MODE.PUBLIC) {
  const profile = await getOrCreateProfile(userId);

  // Build a simulated snapshot from current draft
  const draftSnapshot = {
    headline: profile.headline,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    avatarVisibility: profile.avatarVisibility,
    coverUrl: profile.coverUrl,
    location: profile.location ? profile.location.toObject() : {},
    contact: profile.contact ? profile.contact.toObject() : {},
    socialLinks: profile.socialLinks.map((s) => s.toObject()),
    education: profile.education.map((s) => s.toObject()),
    experience: profile.experience.map((s) => s.toObject()),
    skills: profile.skills.map((s) => s.toObject()),
    projects: profile.projects.map((s) => s.toObject()),
    certifications: profile.certifications.map((s) => s.toObject()),
    services: profile.services.map((s) => s.toObject()),
    awards: profile.awards.map((s) => s.toObject()),
    publications: profile.publications.map((s) => s.toObject()),
    customSections: profile.customSections.map((s) => s.toObject()),
    sectionVisibility: Object.fromEntries(profile.sectionVisibility),
    fieldVisibility: profile.fieldVisibility instanceof Map
      ? Object.fromEntries(profile.fieldVisibility)
      : (profile.fieldVisibility || {}),
    sectionOrder: profile.sectionOrder,
    activeMode: mode,
  };

  return filterProfileByVisibility(draftSnapshot, mode);
}

// ---------------------------------------------------------------------------
// Professional Identities
// ---------------------------------------------------------------------------

export async function getUserIdentities(userId) {
  return ProfessionalIdentity.find({ userId })
    .sort({ isPrimary: -1, displayOrder: 1 })
    .populate('professionId', 'name slug isOfficial')
    .lean();
}

export async function createIdentity(userId, { customTitle, professionId, isPrimary, displayOrder }) {
  // If set to primary, unset any existing primary for this user
  if (isPrimary) {
    await ProfessionalIdentity.updateMany({ userId }, { $set: { isPrimary: false } });
  } else {
    // If user has no existing identities, make this one primary automatically
    const count = await ProfessionalIdentity.countDocuments({ userId });
    if (count === 0) {
      isPrimary = true;
    }
  }

  const identity = await ProfessionalIdentity.create({
    userId,
    customTitle,
    professionId: professionId || null,
    isPrimary: Boolean(isPrimary),
    displayOrder: displayOrder || 0,
  });

  return identity.toSafeObject();
}

export async function updateIdentity(userId, identityId, updates) {
  const identity = await ProfessionalIdentity.findOne({ _id: identityId, userId });
  if (!identity) {
    throw new NotFoundError('Professional identity not found');
  }

  if (updates.isPrimary) {
    await ProfessionalIdentity.updateMany(
      { userId, _id: { $ne: identityId } },
      { $set: { isPrimary: false } },
    );
    identity.isPrimary = true;
  }

  if (updates.customTitle !== undefined) {identity.customTitle = updates.customTitle;}
  if (updates.professionId !== undefined) {identity.professionId = updates.professionId || null;}
  if (updates.displayOrder !== undefined) {identity.displayOrder = updates.displayOrder;}

  await identity.save();
  return identity.toSafeObject();
}

export async function deleteIdentity(userId, identityId) {
  const identity = await ProfessionalIdentity.findOne({ _id: identityId, userId });
  if (!identity) {
    throw new NotFoundError('Professional identity not found');
  }

  const wasPrimary = identity.isPrimary;
  await ProfessionalIdentity.deleteOne({ _id: identityId });

  // If the deleted identity was primary, promote another one
  if (wasPrimary) {
    const nextIdentity = await ProfessionalIdentity.findOne({ userId }).sort({ displayOrder: 1 });
    if (nextIdentity) {
      nextIdentity.isPrimary = true;
      await nextIdentity.save();
    }
  }

  return { message: 'Professional identity deleted.' };
}

/**
 * Update the user's selected Profile Template.
 * IMPORTANT: Existing user profile sections are NEVER destroyed or deleted.
 */
export async function updateProfileTemplate(userId, { templateId, templateSlug, personaId, allowLocked = false }) {
  const profile = await getOrCreateProfile(userId, personaId);
  const template = await profileTemplateService.getTemplateBySlugOrId(templateId || templateSlug);

  const isLocked = template.slug === 'professional' ? false : (template.isLocked !== undefined ? Boolean(template.isLocked) : true);
  if (!allowLocked && isLocked) {
    throw new ValidationError(
      'This template is currently locked and coming soon... for now! The Basic Universal Template is active for all profiles.'
    );
  }

  profile.templateId = template._id || template.id;
  profile.templateSlug = template.slug;
  await profile.save();

  // Populate template for client response
  profile.templateId = template;

  const recommendations = await getProfileRecommendations(userId, {
    templateIdOverride: template._id || template.id,
    personaIdOverride: profile._id,
  });

  return {
    profile,
    template,
    recommendations,
  };
}

/**
 * Dynamic Template Recommendations Engine.
 */
export async function getProfileRecommendations(
  userId,
  { templateIdOverride, templateSlugOverride, personaIdOverride, professionIdsOverride = [] } = {},
) {
  const profile = await getOrCreateProfile(userId, personaIdOverride);

  // 1. Resolve template
  let template = null;
  if (templateIdOverride || templateSlugOverride) {
    try {
      template = await profileTemplateService.getTemplateBySlugOrId(
        templateIdOverride || templateSlugOverride,
      );
    } catch {
      // Fallback
    }
  }

  if (!template) {
    if (profile.templateId && profile.templateId.recommendedSectionIds) {
      template = profile.templateId;
    } else if (profile.templateId) {
      try {
        template = await profileTemplateService.getTemplateBySlugOrId(profile.templateId);
      } catch {
        // Fallback
      }
    } else if (profile.templateSlug) {
      try {
        template = await profileTemplateService.getTemplateBySlugOrId(profile.templateSlug);
      } catch {
        // Fallback
      }
    }
  }

  if (!template) {
    template = await profileTemplateService.getDefaultTemplate();
  }

  // 2. Base recommendations from Template
  const templateRecommendations = Array.isArray(template?.recommendedSectionIds)
    ? [...template.recommendedSectionIds]
    : ['about', 'experience', 'skills', 'projects', 'education'];

  // 3. Additional recommendations from Professional Identities & Persona Profession Title
  let professionIds = [];
  let customTitles = [];
  if (Array.isArray(professionIdsOverride) && professionIdsOverride.length > 0) {
    professionIds = professionIdsOverride;
  } else {
    if (profile.professionTitle) {
      customTitles.push(profile.professionTitle);
    }
    const identities = await ProfessionalIdentity.find({ userId }).lean();
    professionIds = identities.map((id) => id.professionId).filter(Boolean);
    customTitles = Array.from(new Set([...customTitles, ...identities.map((id) => id.customTitle).filter(Boolean)]));
  }

  const roleRecommendations = await getRecommendationsForProfessions(professionIds, customTitles);

  // 4. Combine & Deduplicate recommendations (Preserve sensible ordering)
  const combinedSet = new Set(templateRecommendations);
  for (const roleSec of roleRecommendations) {
    combinedSet.add(roleSec);
  }
  const combinedRecommendations = Array.from(combinedSet);

  // 5. Detect existing sections currently populated in user's profile
  const existingSections = [];
  if (profile.bio?.trim() || profile.headline?.trim()) existingSections.push('about');
  if (profile.experience?.length) existingSections.push('experience');
  if (profile.education?.length) existingSections.push('education');
  if (profile.skills?.length) existingSections.push('skills');
  if (profile.projects?.length) existingSections.push('projects');
  if (profile.certifications?.length) existingSections.push('certifications');
  if (profile.services?.length) existingSections.push('services');
  if (profile.awards?.length) existingSections.push('awards');
  if (profile.publications?.length) existingSections.push('publications');
  if (profile.achievements?.length) existingSections.push('achievements');
  if (profile.mediaGallery?.length) existingSections.push('mediaGallery');
  if (profile.blogs?.length) existingSections.push('blogs');
  if (profile.research?.length) existingSections.push('research');
  if (profile.courses?.length) existingSections.push('courses');
  if (profile.speaking?.length) existingSections.push('speaking');
  if (profile.organizations?.length) existingSections.push('organizations');
  if (profile.teaching?.length) existingSections.push('teaching');
  if (profile.socialLinks?.length) existingSections.push('socialLinks');
  if (
    profile.contact &&
    (profile.contact.email?.trim() ||
      profile.contact.phone?.trim() ||
      profile.contact.website?.trim() ||
      profile.contact.address?.trim())
  ) {
    existingSections.push('contact');
  }
  if (profile.customSections?.length) existingSections.push('customSections');

  // 6. Calculate missing recommended sections
  const missingRecommendedSections = combinedRecommendations.filter(
    (sec) => !existingSections.includes(sec),
  );

  return {
    template: typeof template.toSafeObject === 'function' ? template.toSafeObject() : template,
    templateRecommendations,
    roleRecommendations,
    combinedRecommendations,
    existingSections,
    missingRecommendedSections,
  };
}

/**
 * Get aggregated, deduplicated recommended sections based on all user's professional identities.
 */
export async function getRecommendedSectionsForUser(userId) {
  const recommendations = await getProfileRecommendations(userId);
  return recommendations.combinedRecommendations;
}

// ---------------------------------------------------------------------------
// Digital Identity & Username Change
// ---------------------------------------------------------------------------

export async function changeUsername(userId, newUsername) {
  const normalized = newUsername.trim().toLowerCase();

  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (user.username === normalized) {
    return { message: 'Username is unchanged', username: normalized };
  }

  // Check 30-day cooldown
  if (user.lastUsernameChangedAt) {
    const elapsedMs = Date.now() - new Date(user.lastUsernameChangedAt).getTime();
    const cooldownMs = USERNAME.CHANGE_COOLDOWN_DAYS * 24 * 3600 * 1000;
    if (elapsedMs < cooldownMs) {
      const remainingDays = Math.ceil((cooldownMs - elapsedMs) / (24 * 3600 * 1000));
      throw new AppError(
        `Username can only be changed once every ${USERNAME.CHANGE_COOLDOWN_DAYS} days. Please wait ${remainingDays} more day(s).`,
        ERROR_CODE.USERNAME_COOLDOWN,
        429,
      );
    }
  }

  // Check reserved usernames
  const isReserved = await isUsernameReserved(normalized);
  if (isReserved) {
    throw new ConflictError('This username is reserved and cannot be claimed', ERROR_CODE.USERNAME_RESERVED);
  }

  // Check if username is currently taken by another user
  const existingUser = await User.findOne({ username: normalized }).lean();
  if (existingUser) {
    throw new ConflictError('This username is already taken', ERROR_CODE.USERNAME_TAKEN);
  }

  // Check if username exists in history (permanent reservation of old usernames)
  const historyRecord = await UsernameHistory.findOne({ oldUsername: normalized }).lean();
  if (historyRecord) {
    throw new ConflictError('This username has been previously registered and is permanently reserved', ERROR_CODE.USERNAME_TAKEN);
  }

  const oldUsername = user.username;

  // Atomically update user and record history
  user.username = normalized;
  user.lastUsernameChangedAt = new Date();
  await user.save();

  await UsernameHistory.create({
    oldUsername,
    newUsername: normalized,
    userId,
  });

  return {
    message: 'Username changed successfully.',
    username: normalized,
    oldUsername,
  };
}
