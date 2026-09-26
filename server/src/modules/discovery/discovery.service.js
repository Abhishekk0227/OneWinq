import mongoose from 'mongoose';
import { User } from '../users/user.model.js';
import { Profile } from '../profiles/profile.model.js';
import { ProfessionalIdentity } from '../profiles/professionalIdentity.model.js';
import { getBlockedUserIds, getConnectionStatus } from '../connections/connection.service.js';
import { Connection, getCanonicalUserPair } from '../connections/connection.model.js';
import { filterProfileByVisibility } from '../profiles/visibilityResolver.js';
import { ACCOUNT_STATE, PROFILE_STATE } from '../../config/constants.js';

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

  // Fetch candidate users
  const candidateUsers = await User.find(userFilter)
    .sort({ _id: -1 })
    .limit(limit * 2) // Over-fetch to allow post-filtering on profile criteria
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
    Profile.find(profileFilter).lean(),
    ProfessionalIdentity.find({ userId: { $in: candidateUserIds } })
      .sort({ isPrimary: -1, displayOrder: 1 })
      .lean(),
  ]);

  const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));

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

    validCards.push({
      id: uStr,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: filteredProfile.avatarUrl || user.avatarUrl || null,
      headline: filteredProfile.headline || '',
      primaryProfession: primaryIdn ? primaryIdn.customTitle : null,
      otherProfessions: otherIdns.map((i) => i.customTitle),
      identities: userIdentities,
      skills: skillList,
      topSkills: topSkillNames,
      location: filteredProfile.location || null,
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
