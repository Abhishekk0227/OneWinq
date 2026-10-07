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
    if (configuredVisibility === 'ALL') {return true;}
    if (Array.isArray(configuredVisibility)) {
      if (configuredVisibility.length === 0) return true;
      if (configuredVisibility.includes('ALL')) return true;
      if (configuredVisibility.includes(effectiveMode)) return true;
      return false;
    }
    // Backward compatibility for legacy single-string visibility
    if (configuredVisibility === SECTION_VISIBILITY.PUBLIC) {return true;}
    if (configuredVisibility === effectiveMode) {return true;}
    return false;
  }

  // Extract mode-specific overrides if configured for the current effective mode
  const modeData =
    profileSnapshot.modeData instanceof Map
      ? Object.fromEntries(profileSnapshot.modeData)
      : profileSnapshot.modeData || {};
  const modeOverride = modeData[effectiveMode] || {};

  const effectiveDisplayName =
    modeOverride.displayName !== undefined && modeOverride.displayName !== ''
      ? modeOverride.displayName
      : profileSnapshot.displayName || '';

  const effectiveProfessionTitle =
    modeOverride.professionTitle !== undefined && modeOverride.professionTitle !== ''
      ? modeOverride.professionTitle
      : profileSnapshot.professionTitle || '';

  const effectiveHeadline =
    modeOverride.headline !== undefined && modeOverride.headline !== ''
      ? modeOverride.headline
      : profileSnapshot.headline || '';

  const effectiveBio =
    modeOverride.bio !== undefined && modeOverride.bio !== ''
      ? modeOverride.bio
      : profileSnapshot.bio || '';

  const effectiveAvatarUrl =
    modeOverride.avatarUrl !== undefined && modeOverride.avatarUrl !== null
      ? modeOverride.avatarUrl
      : profileSnapshot.avatarUrl;

  const effectiveCoverUrl =
    modeOverride.coverUrl !== undefined && modeOverride.coverUrl !== null
      ? modeOverride.coverUrl
      : profileSnapshot.coverUrl;

  const result = {
    displayName: effectiveDisplayName,
    professionTitle: effectiveProfessionTitle,
    headline: effectiveHeadline,
    bio: isVisible(secVis.about) ? effectiveBio : '',
    avatarUrl: isVisible(profileSnapshot.avatarVisibility) ? effectiveAvatarUrl : null,
    coverUrl: effectiveCoverUrl || null,
    effectiveMode,
    sections: {},
    customSections: [],
  };

  // Location (with mode-level overrides)
  if (isVisible(secVis.location) && (profileSnapshot.location || modeOverride.location)) {
    const baseLoc = profileSnapshot.location || {};
    const overLoc = modeOverride.location || {};
    result.location = {
      city: overLoc.city !== undefined && overLoc.city !== '' ? overLoc.city : (baseLoc.city || ''),
      state: overLoc.state !== undefined && overLoc.state !== '' ? overLoc.state : (baseLoc.state || ''),
      country: overLoc.country !== undefined && overLoc.country !== '' ? overLoc.country : (baseLoc.country || ''),
      isRemote: overLoc.isRemote !== undefined ? Boolean(overLoc.isRemote) : Boolean(baseLoc.isRemote),
    };
  } else {
    result.location = null;
  }

  // Contact (with field-level overrides and modeData contact overrides)
  if (isVisible(secVis.contact) && (profileSnapshot.contact || modeOverride.contact)) {
    const baseContact = profileSnapshot.contact || {};
    const overContact = modeOverride.contact || {};
    const contact = {};
    if (isVisible(fldVis['contact.email'])) {
      contact.email = overContact.email !== undefined && overContact.email !== '' ? overContact.email : (baseContact.email || '');
    }
    if (isVisible(fldVis['contact.phone'])) {
      contact.phone = overContact.phone !== undefined && overContact.phone !== '' ? overContact.phone : (baseContact.phone || '');
    }
    if (isVisible(fldVis['contact.website'])) {
      contact.website = overContact.website !== undefined && overContact.website !== '' ? overContact.website : (baseContact.website || '');
    }
    if (isVisible(fldVis['contact.address'])) {
      contact.address = overContact.address !== undefined && overContact.address !== '' ? overContact.address : (baseContact.address || '');
    }
    result.contact = Object.keys(contact).length > 0 ? contact : null;
  } else {
    result.contact = null;
  }

  // Social Links
  if (isVisible(secVis.socialLinks) && Array.isArray(profileSnapshot.socialLinks)) {
    result.socialLinks = profileSnapshot.socialLinks
      .filter((s) => {
        if (!s) return false;
        if (s.modes && Array.isArray(s.modes) && s.modes.length > 0) {
          return s.modes.includes(effectiveMode) || s.modes.includes('ALL');
        }
        if (s.visibility) {
          return isVisible(s.visibility);
        }
        return true;
      })
      .map((s) => ({
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
      const filtered = profileSnapshot[key].filter((item) => {
        if (!item) return false;
        if (item.modes && Array.isArray(item.modes) && item.modes.length > 0) {
          return item.modes.includes(effectiveMode) || item.modes.includes('ALL');
        }
        if (item.visibility) {
          return isVisible(item.visibility);
        }
        return true;
      });
      let sorted = filtered;
      if (key === 'experience') {
        sorted = [...filtered].sort((a, b) => {
          if (a.current && !b.current) return -1;
          if (!a.current && b.current) return 1;
          if (a.current && b.current) {
            const startA = (a.startYear || 0) * 12 + (a.startMonth || 1);
            const startB = (b.startYear || 0) * 12 + (b.startMonth || 1);
            return startB - startA;
          }
          const getEndVal = (x) => {
            if (x.endYear) return x.endYear * 12 + (x.endMonth || 12);
            if (x.endDate) {
              const d = new Date(x.endDate).getTime();
              if (!isNaN(d)) return d;
            }
            return 0;
          };
          const endA = getEndVal(a);
          const endB = getEndVal(b);
          if (endA !== endB) return endB - endA;

          const getStartVal = (x) => {
            if (x.startYear) return x.startYear * 12 + (x.startMonth || 1);
            if (x.startDate) {
              const d = new Date(x.startDate).getTime();
              if (!isNaN(d)) return d;
            }
            return 0;
          };
          return getStartVal(b) - getStartVal(a);
        });
      } else if (key === 'education') {
        sorted = [...filtered].sort((a, b) => {
          if (a.current && !b.current) return -1;
          if (!a.current && b.current) return 1;
          const endA = (a.endYear || 0) * 12 + (a.endMonth || 12);
          const endB = (b.endYear || 0) * 12 + (b.endMonth || 12);
          if (endA !== endB) return endB - endA;
          const startA = (a.startYear || 0) * 12 + (a.startMonth || 1);
          const startB = (b.startYear || 0) * 12 + (b.startMonth || 1);
          return startB - startA;
        });
      }
      result.sections[key] = sorted;
      result[key] = sorted;
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

  // Private Documents: strictly visible ONLY in PRIVATE mode, and only if showOnProfile is true
  if (effectiveMode === VISIBILITY_MODE.PRIVATE && Array.isArray(profileSnapshot.privateDocuments)) {
    const visibleDocs = profileSnapshot.privateDocuments.filter(
      (item) => item && (item.showOnProfile === true || item.metadata?.showOnProfile === true)
    );
    result.privateDocuments = visibleDocs;
    if (!result.sections) result.sections = {};
    result.sections.privateDocuments = visibleDocs;
  } else {
    delete result.privateDocuments;
    if (result.sections) {
      delete result.sections.privateDocuments;
    }
  }

  return result;
}
