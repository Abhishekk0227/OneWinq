import { VISIBILITY_MODE, SECTION_VISIBILITY } from '../../config/constants.js';

/**
 * Determine the current effective presentation mode for a profile.
 * Evaluates temporary mode expiration.
 *
 * @param {{ activeMode?: string, temporaryMode?: { mode?: string, expiresAt?: Date, fallbackMode?: string } }} profile
 * @returns {string} effective mode: 'PUBLIC' | 'PROFESSIONAL' | 'PRIVATE'
 */
export function resolveEffectiveMode(profile) {
  if (!profile) {return VISIBILITY_MODE.PUBLIC;}

  const temp = profile.temporaryMode;
  if (temp && temp.mode && temp.expiresAt) {
    const expires = new Date(temp.expiresAt).getTime();
    if (Date.now() < expires) {
      return temp.mode;
    }
    // Expired — use fallback or default activeMode
    return temp.fallbackMode || profile.activeMode || VISIBILITY_MODE.PUBLIC;
  }

  return profile.activeMode || VISIBILITY_MODE.PUBLIC;
}

/**
 * Filter a profile snapshot according to the effective presentation mode.
 * Sections and fields configured for the active mode are included.
 * Sensitive / non-matching fields are completely stripped from the returned object.
 *
 * @param {object} profileSnapshot - The published snapshot of the profile
 * @param {string} [forcedMode] - Optional override mode (e.g. for user previewing their profile)
 * @returns {object} Cleaned public profile object
 */
export function filterProfileByVisibility(profileSnapshot, forcedMode = null) {
  if (!profileSnapshot) {return null;}

  const effectiveMode = forcedMode || resolveEffectiveMode(profileSnapshot);

  // Convert Mongoose Map or plain object to standard JS object
  const secVis =
    profileSnapshot.sectionVisibility instanceof Map
      ? Object.fromEntries(profileSnapshot.sectionVisibility)
      : profileSnapshot.sectionVisibility || {};

  const fldVis =
    profileSnapshot.fieldVisibility instanceof Map
      ? Object.fromEntries(profileSnapshot.fieldVisibility)
      : profileSnapshot.fieldVisibility || {};

  /**
   * Check if a section or field is visible in the current mode.
   * In OneWinq:
   * - PUBLIC visibility is visible in PUBLIC mode.
   * - PROFESSIONAL visibility is visible in PROFESSIONAL mode.
   * - PRIVATE visibility is visible in PRIVATE mode.
   * Note: In addition, PUBLIC content is generally visible in all visitor modes unless restricted.
   * To be consistent with "There is no automatic inheritance. Each mode has its own configuration",
   * we check whether the item's configured visibility matches the effective mode (or is PUBLIC).
   */
  function isVisible(configuredVisibility) {
    if (!configuredVisibility) {return true;}
    if (configuredVisibility === effectiveMode) {return true;}
    // Public sections can be shown in Professional mode as baseline
    if (effectiveMode === VISIBILITY_MODE.PROFESSIONAL && configuredVisibility === SECTION_VISIBILITY.PUBLIC) {
      return true;
    }
    return false;
  }

  const result = {
    headline: profileSnapshot.headline || '',
    bio: isVisible(secVis.about) ? profileSnapshot.bio || '' : '',
    avatarUrl: isVisible(profileSnapshot.avatarVisibility) ? profileSnapshot.avatarUrl : null,
    coverUrl: profileSnapshot.coverUrl || null,
    effectiveMode,
    sections: {},
    customSections: [],
  };

  // Location
  if (isVisible(secVis.location) && profileSnapshot.location) {
    result.location = {
      city: profileSnapshot.location.city || '',
      state: profileSnapshot.location.state || '',
      country: profileSnapshot.location.country || '',
      isRemote: Boolean(profileSnapshot.location.isRemote),
    };
  } else {
    result.location = null;
  }

  // Contact (with field-level overrides)
  if (isVisible(secVis.contact) && profileSnapshot.contact) {
    const contact = {};
    if (isVisible(fldVis['contact.email'])) {
      contact.email = profileSnapshot.contact.email || '';
    }
    if (isVisible(fldVis['contact.phone'])) {
      contact.phone = profileSnapshot.contact.phone || '';
    }
    if (isVisible(fldVis['contact.website'])) {
      contact.website = profileSnapshot.contact.website || '';
    }
    if (isVisible(fldVis['contact.address'])) {
      contact.address = profileSnapshot.contact.address || '';
    }
    result.contact = Object.keys(contact).length > 0 ? contact : null;
  } else {
    result.contact = null;
  }

  // Social Links
  if (isVisible(secVis.socialLinks) && Array.isArray(profileSnapshot.socialLinks)) {
    result.socialLinks = profileSnapshot.socialLinks.map((s) => ({
      id: s.id,
      platform: s.platform,
      url: s.url,
      label: s.label || '',
    }));
  } else {
    result.socialLinks = [];
  }

  // Structured multi-entry sections
  const structuredKeys = [
    'education',
    'experience',
    'skills',
    'projects',
    'certifications',
    'services',
    'awards',
    'publications',
    'achievements',
    'mediaGallery',
    'blogs',
    'research',
    'courses',
    'speaking',
    'organizations',
    'teaching',
  ];

  for (const key of structuredKeys) {
    if (isVisible(secVis[key]) && Array.isArray(profileSnapshot[key])) {
      result.sections[key] = profileSnapshot[key];
      result[key] = profileSnapshot[key];
    }
  }

  // Custom sections
  if (Array.isArray(profileSnapshot.customSections)) {
    result.customSections = profileSnapshot.customSections
      .filter((cs) => isVisible(secVis[`custom_${cs.id}`] || SECTION_VISIBILITY.PUBLIC))
      .map((cs) => ({
        id: cs.id,
        title: cs.title,
        description: cs.description,
        blocks: cs.blocks || [],
        displayOrder: cs.displayOrder,
      }));
  }

  // Section order
  if (Array.isArray(profileSnapshot.sectionOrder)) {
    result.sectionOrder = profileSnapshot.sectionOrder.filter((key) => {
      if (key.startsWith('custom_')) {
        const id = key.replace('custom_', '');
        return result.customSections.some((cs) => cs.id === id);
      }
      return key in result.sections || key === 'about' || key === 'contact' || key === 'socialLinks';
    });
  }

  return result;
}
