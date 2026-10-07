import mongoose from 'mongoose';
import { User } from '../users/user.model.js';
import { Profile } from '../profiles/profile.model.js';
import { ProfessionalIdentity } from '../profiles/professionalIdentity.model.js';
import { getBlockedUserIds, getConnectionStatus } from '../connections/connection.service.js';
import { Connection, getCanonicalUserPair } from '../connections/connection.model.js';
import { filterProfileByVisibility } from '../profiles/visibilityResolver.js';
import { filterToCardActive } from '../cards/cardGate.js';
import { getOrCreateProfile } from '../profiles/profile.service.js';
import { ACCOUNT_STATE, PROFILE_STATE } from '../../config/constants.js';
import logger from '../../utils/logger.js';

/**
 * Search & Discovery Service.
 * Implements multi-criteria search with privacy filtering and cursor pagination.
 *
 * @param {object} params
 * @param {string} [viewerId] - Requesting user ID (optional)
 * @returns {Promise<object>} Paginated result cards
 */
export async function searchDiscovery(
  { q, profession, skill, country, city, isRemote, cursor, limit = 20 },
  viewerId = null,
) {
  // 1. Build excluded user ID set (self + blocked users)
  const excludedIds = new Set();
  if (viewerId) {
    excludedIds.add(String(viewerId));
    const blockedSet = await getBlockedUserIds(viewerId);
    for (const b of blockedSet) {
      excludedIds.add(b);
    }
  }

  // Convert to ObjectIds for query
  const excludedObjIds = Array.from(excludedIds).map((id) => new mongoose.Types.ObjectId(id));

  // 2. Base user filter
  const userFilter = {
    accountState: ACCOUNT_STATE.ACTIVE,
    appearInDiscovery: { $ne: false },
  };

  if (excludedObjIds.length > 0) {
    userFilter._id = { $nin: excludedObjIds };
  }

  if (cursor) {
    userFilter._id = {
      ...userFilter._id,
      $lt: new mongoose.Types.ObjectId(cursor),
    };
  }

  // Text search on username or display name if q is provided
  if (q && q.trim()) {
    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    userFilter.$or = [
      { username: { $regex: escaped, $options: 'i' } },
      { displayName: { $regex: escaped, $options: 'i' } },
    ];
  }

  // Fetch candidate users (over-fetch to allow post-filtering)
  const candidateUsers = await User.find(userFilter)
    .sort({ _id: -1 })
    .limit(limit * 4) // Over-fetch to allow card-gate + profile criteria filtering
    .select('displayName username avatarUrl appearInDiscovery')
    .lean();

  if (candidateUsers.length === 0) {
    return {
      results: [],
      users: [],
      nextCursor: null,
      hasNextPage: false,
    };
  }

  // Check physical NFC card status for candidate users (for badges/metadata without excluding digital profiles)
  const cardActiveSet = await filterToCardActive(candidateUsers.map((u) => u._id));
  const candidateUserIds = candidateUsers.map((u) => u._id);

  // 3. Fetch profiles for candidate users (support published and active profiles)
  const profileFilter = {
    userId: { $in: candidateUserIds },
  };

  if (country) {
    profileFilter.$or = [
      { 'publishedData.location.country': { $regex: country, $options: 'i' } },
      { 'location.country': { $regex: country, $options: 'i' } },
    ];
  }
  if (city) {
    profileFilter.$or = [
      { 'publishedData.location.city': { $regex: city, $options: 'i' } },
      { 'location.city': { $regex: city, $options: 'i' } },
    ];
  }
  if (isRemote !== undefined) {
    profileFilter.$or = [
      { 'publishedData.location.isRemote': isRemote },
      { 'location.isRemote': isRemote },
    ];
  }
  if (skill) {
    profileFilter.$or = [
      { 'publishedData.skills.name': { $regex: skill, $options: 'i' } },
      { 'skills.name': { $regex: skill, $options: 'i' } },
    ];
  }

  const [profiles, identities] = await Promise.all([
    Profile.find(profileFilter)
      .sort({ isActive: -1, updatedAt: -1 })
      .populate('templateId')
      .lean(),
    ProfessionalIdentity.find({ userId: { $in: candidateUserIds } })
      .sort({ isPrimary: -1, displayOrder: 1 })
      .lean(),
  ]);

  const profileMap = new Map();
  for (const p of profiles) {
    const uStr = p.userId.toString();
    if (!profileMap.has(uStr)) {
      profileMap.set(uStr, p);
    } else {
      const existing = profileMap.get(uStr);
      if (!existing.isActive && p.isActive) {
        profileMap.set(uStr, p);
      } else if (existing.isActive === p.isActive) {
        const existingHasData = Boolean(existing.headline || existing.publishedData?.headline);
        const pHasData = Boolean(p.headline || p.publishedData?.headline);
        if (!existingHasData && pHasData) {
          profileMap.set(uStr, p);
        }
      }
    }
  }

  // Ensure every candidate user has a profile initialized (auto-provision default profile if missing)
  for (const user of candidateUsers) {
    const uStr = user._id.toString();
    if (!profileMap.has(uStr)) {
      try {
        const newProf = await getOrCreateProfile(user._id);
        if (newProf) {
          const leanProf = typeof newProf.toObject === 'function' ? newProf.toObject() : newProf;
          profileMap.set(uStr, leanProf);
        }
      } catch (err) {
        logger.warn('Failed auto-provisioning profile in discovery', { userId: uStr, error: err?.message });
        profileMap.set(uStr, {
          userId: user._id,
          personaName: 'Basic Universal Template',
          professionTitle: 'Basic Universal Template',
          templateSlug: 'professional',
          headline: '',
          location: {},
        });
      }
    }
  }

  // Group identities by userId
  const identityMap = new Map();
  for (const idn of identities) {
    const uStr = idn.userId.toString();
    if (!identityMap.has(uStr)) {
      identityMap.set(uStr, []);
    }
    identityMap.get(uStr).push(idn);
  }

  // 4. Assemble and filter result cards
  const validCards = [];

  for (const user of candidateUsers) {
    const uStr = user._id.toString();
    const profile = profileMap.get(uStr);
    const profileSource = profile?.publishedData || profile || {};
    const filteredProfile = profile?.publishedData
      ? filterProfileByVisibility(profile.publishedData)
      : profileSource;

    const userIdentities = identityMap.get(uStr) || [];
    const primaryIdn = userIdentities.find((i) => i.isPrimary) || userIdentities[0];
    const otherIdns = userIdentities.filter((i) => i !== primaryIdn);

    // If profession filter specified, check identity match
    if (profession && profession.trim()) {
      const pLower = profession.trim().toLowerCase();
      const matchesPrimary = primaryIdn && primaryIdn.customTitle.toLowerCase().includes(pLower);
      const matchesOther = otherIdns.some((i) => i.customTitle.toLowerCase().includes(pLower));
      if (!matchesPrimary && !matchesOther) {
        continue;
      }
    }

    // Determine connection status relative to viewer
    let connectionStatus = 'NONE';
    let connectionId = null;
    if (viewerId) {
      try {
        const { userLow, userHigh } = getCanonicalUserPair(viewerId, user._id);
        const rel = await Connection.findOne({ userLow, userHigh });
        if (rel) {
          connectionStatus = rel.getRelativeState(viewerId);
          connectionId = rel._id.toString();
        }
      } catch {
        connectionStatus = 'NONE';
      }
    }

    // Top skills
    const rawSkills = filteredProfile.sections?.skills || filteredProfile.skills || [];
    const skillList = rawSkills.slice(0, 5).map((s) => (typeof s === 'string' ? { name: s } : { name: s.name || '' }));
    const topSkillNames = skillList.map((s) => s.name).filter(Boolean);

    // Robust template name resolution (e.g. 'Basic Universal Template', 'Founder', 'Engineer')
    const rawTemplateName =
      profile?.templateId?.name ||
      (profile?.templateSlug && profile.templateSlug !== 'professional'
        ? profile.templateSlug.charAt(0).toUpperCase() + profile.templateSlug.slice(1)
        : null) ||
      (profile?.personaName && profile.personaName !== 'Primary Profile' && profile.personaName !== 'Profile'
        ? profile.personaName
        : null) ||
      'Basic Universal Template';
    const resolvedTemplateName = rawTemplateName.trim();

    // Robust headline / profession resolution
    const resolvedHeadline =
      (filteredProfile.headline && filteredProfile.headline.trim()) ||
      (filteredProfile.professionTitle && filteredProfile.professionTitle.trim()) ||
      (primaryIdn && primaryIdn.customTitle && primaryIdn.customTitle.trim()) ||
      (profile?.headline && profile.headline.trim()) ||
      (profile?.professionTitle && profile.professionTitle.trim()) ||
      (profile?.publishedData?.headline && profile.publishedData.headline.trim()) ||
      (profile?.publishedData?.professionTitle && profile.publishedData.professionTitle.trim()) ||
      (profile?.personaName && profile.personaName !== 'Primary Profile' && profile.personaName !== 'Profile' && profile.personaName.trim()) ||
      (profile?.templateId?.name && profile.templateId.name.trim()) ||
      resolvedTemplateName ||
      'Basic Universal Template';

    // Robust location resolution (support object and string representations across all persona stores)
    const candidateLocs = [
      filteredProfile.location,
      profile?.location,
      profile?.publishedData?.location,
      profile?.modeData?.PUBLIC?.location,
      profile?.modeData?.PROFESSIONAL?.location,
      profile?.sections?.about?.location,
      profile?.contact?.address,
      profile?.sections?.contact?.address,
    ];
    let resolvedLocation = null;
    for (const cand of candidateLocs) {
      if (!cand) continue;
      if (typeof cand === 'string' && cand.trim()) {
        const parts = cand.split(',').map((p) => p.trim()).filter(Boolean);
        resolvedLocation = {
          city: parts[0] || cand.trim(),
          state: parts.length > 2 ? parts[1] : '',
          country: parts.length > 1 ? parts[parts.length - 1] : '',
          isRemote: cand.toLowerCase().includes('remote'),
        };
        break;
      }
      if (typeof cand === 'object' && (cand.city || cand.state || cand.country)) {
        resolvedLocation = {
          city: cand.city || '',
          state: cand.state || '',
          country: cand.country || '',
          isRemote: Boolean(cand.isRemote),
        };
        break;
      }
    }

    validCards.push({
      id: uStr,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: filteredProfile.avatarUrl || user.avatarUrl || profile?.avatarUrl || null,
      headline: resolvedHeadline,
      primaryProfession: primaryIdn ? primaryIdn.customTitle : (resolvedHeadline || null),
      otherProfessions: otherIdns.map((i) => i.customTitle),
      identities: userIdentities,
      templateName: resolvedTemplateName,
      templateSlug: profile?.templateSlug || profile?.templateId?.slug || 'professional',
      skills: skillList,
      topSkills: topSkillNames,
      location: resolvedLocation,
      hasActiveCard: cardActiveSet.has(uStr),
      connectionStatus,
      connectionState: connectionStatus,
      connectionId,
    });

    if (validCards.length >= limit) {
      break;
    }
  }

  const hasNextPage = candidateUsers.length > limit && validCards.length === limit;
  const nextCursor = hasNextPage ? candidateUsers[limit - 1]._id.toString() : null;

  return {
    results: validCards,
    users: validCards,
    nextCursor,
    hasNextPage,
  };
}
