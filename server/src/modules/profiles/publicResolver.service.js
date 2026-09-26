import { User } from '../users/user.model.js';
import { Profile } from './profile.model.js';
import { Card } from '../cards/card.model.js';
import { UsernameHistory } from './usernameHistory.model.js';
import { ProfessionalIdentity } from './professionalIdentity.model.js';
import { filterProfileByVisibility } from './visibilityResolver.js';
import { eventBus } from '../../events/eventBus.js';
import { Connection, getCanonicalUserPair } from '../connections/connection.model.js';
import { isBlockedMutual } from '../connections/connection.service.js';
import { NotFoundError } from '../../shared/errors.js';
import { ACCOUNT_STATE, PROFILE_STATE, CARD_STATE, APP_EVENT } from '../../config/constants.js';

/**
 * Public profile resolver service.
 * Implements the 12-step resolver pipeline specified in Section 14
 * with Option C Card-Gated Profile Protection and Dual-Binding.
 *
 * @param {string} rawUsername
 * @param {{ viewerId?: string, ip?: string, userAgent?: string }} context
 * @returns {Promise<object>} Safe, mode-filtered profile
 */
export async function resolvePublicProfile(rawUsername, context = {}) {
  if (!rawUsername) {
    throw new NotFoundError('Profile not found');
  }

  // 1. Normalize username
  let username = rawUsername.trim().toLowerCase();

  // 2. Find current username
  let user = await User.findOne({ username }).lean();

  // 3 & 4. Check username history / resolve old username mapping
  if (!user) {
    const history = await UsernameHistory.findOne({ oldUsername: username }).lean();
    if (history) {
      username = history.newUsername;
      user = await User.findOne({ username }).lean();
    }
  }

  // 5. Check account state — anti-enumeration: return generic 404
  if (!user || user.accountState !== ACCOUNT_STATE.ACTIVE) {
    throw new NotFoundError('Profile not found');
  }

  // 5b. Mutual blocking shield — hidden if blocked
  if (context.viewerId && (await isBlockedMutual(context.viewerId, user._id))) {
    throw new NotFoundError('Profile not found');
  }

  // 5c. OPTION C: CARD-GATED PUBLIC PROFILE ENFORCEMENT
  // A public profile is strictly gated until an active physical NFC card is purchased, assigned, and activated.
  const activeCard = await Card.findOne({
    $and: [
      {
        $or: [
          { assignedUser: user._id },
          { userId: user._id },
          { assignedTo: user._id },
        ],
      },
      {
        $or: [
          { state: CARD_STATE.ACTIVE },
          { status: CARD_STATE.ACTIVE },
        ],
      },
    ],
  })
    .select('cardCode cardUid cardId state edition cardType customSlug')
    .lean();

  if (!activeCard) {
    // Record profile-view event asynchronously
    eventBus.publish(APP_EVENT.PROFILE_VIEWED, {
      profileUserId: user._id.toString(),
      profileUsername: user.username,
      viewerId: context.viewerId || null,
      ip: context.ip || null,
      userAgent: context.userAgent || null,
      timestamp: new Date(),
    });

    // If no active card exists, profile details remain strictly locked.
    // Return safe reserved identity metadata for the branded card-activation splash screen.
    return {
      user: {
        id: user._id.toString(),
        _id: user._id.toString(),
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl || null,
        primaryProfession: user.displayName,
        identities: [],
      },
      hasActiveCard: false,
      isCardGated: true,
      cardStatus: 'CARD_REQUIRED',
      activeCard: null,
      profile: null,
      activePersona: null,
      connectionState: 'NONE',
      connectionStatus: 'NONE',
      connectionId: null,
    };
  }

  // 6. Check published profile (resolve currently ACTIVE persona)
  let profile = await Profile.findOne({ userId: user._id, isActive: true }).populate('templateId').lean();
  if (!profile || profile.state !== PROFILE_STATE.PUBLISHED || !profile.publishedData) {
    // Fallback to any published profile for this user
    profile = await Profile.findOne({ userId: user._id, state: PROFILE_STATE.PUBLISHED, publishedData: { $ne: null } })
      .populate('templateId')
      .lean();
  }

  if (!profile || profile.state !== PROFILE_STATE.PUBLISHED || !profile.publishedData) {
    throw new NotFoundError('Profile not found');
  }

  // 7, 8, 9, 10. Resolve active mode & filter sections / fields
  const filteredData = filterProfileByVisibility(profile.publishedData);
  const activeTemplateSlug = profile.templateSlug || profile.templateId?.slug || filteredData.templateSlug || 'professional';
  const activeTitle = profile.professionTitle || profile.personaName || filteredData.professionTitle || '';

  filteredData.templateSlug = activeTemplateSlug;
  filteredData.templateId = profile.templateId || null;
  filteredData.personaName = profile.personaName || 'Profile';
  filteredData.professionTitle = activeTitle;

  // Check relationship relative to viewer
  let connectionState = 'NONE';
  let connectionId = null;
  if (context.viewerId && String(context.viewerId) !== String(user._id)) {
    try {
      const { userLow, userHigh } = getCanonicalUserPair(context.viewerId, user._id);
      const rel = await Connection.findOne({ userLow, userHigh });
      if (rel) {
        connectionState = rel.getRelativeState(context.viewerId);
        connectionId = rel._id.toString();
      }
    } catch {
      connectionState = 'NONE';
    }
  }

  // 11. Return profile envelope (includes public user info + filtered content)
  const result = {
    user: {
      id: user._id.toString(),
      _id: user._id.toString(),
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl || null,
      primaryProfession: activeTitle || user.displayName,
      identities: [{ customTitle: activeTitle || 'Professional', isPrimary: true }],
    },
    activePersona: {
      id: profile._id.toString(),
      personaName: profile.personaName,
      professionTitle: activeTitle,
      templateSlug: activeTemplateSlug,
    },
    identities: [{ customTitle: activeTitle || 'Professional', isPrimary: true }],
    profile: filteredData,
    connectionState,
    connectionStatus: connectionState,
    connectionId,
    hasActiveCard: true,
    isCardGated: false,
    cardStatus: 'ACTIVE',
    activeCard: {
      cardCode: activeCard.cardCode || activeCard.cardUid,
      cardUid: activeCard.cardUid,
      cardId: activeCard.cardId || activeCard.cardCode || activeCard.cardUid,
      edition: activeCard.edition || 'STANDARD',
    },
  };

  // 12. Record profile-view event asynchronously
  eventBus.publish(APP_EVENT.PROFILE_VIEWED, {
    profileUserId: user._id.toString(),
    profileUsername: user.username,
    viewerId: context.viewerId || null,
    ip: context.ip || null,
    userAgent: context.userAgent || null,
    timestamp: new Date(),
  });

  return result;
}
