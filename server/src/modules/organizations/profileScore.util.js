/**
 * Calculate automated profile completion score (0 - 100%)
 * based on the identity triad weighting specified in the OneWinq Enterprise blueprint.
 */
export function calculateProfileCompletionScore(data = {}) {
  if (!data || typeof data !== 'object') {
    return 0;
  }

  let score = 0;

  // 1. Photo / Avatar (20 pts)
  if (data.avatarUrl && typeof data.avatarUrl === 'string' && data.avatarUrl.trim().length > 0) {
    score += 20;
  }

  // 2. Headline / Bio / Display Name (20 pts)
  const hasHeadline = Boolean(
    (data.headline && typeof data.headline === 'string' && data.headline.trim().length > 0) ||
    (data.bio && typeof data.bio === 'string' && data.bio.trim().length > 0)
  );
  const hasName = Boolean(data.displayName && typeof data.displayName === 'string' && data.displayName.trim().length > 0);
  if (hasName && hasHeadline) {
    score += 20;
  } else if (hasName || hasHeadline) {
    score += 10;
  }

  // 3. Professional Designation & Department (20 pts)
  const hasJobTitle = Boolean(data.jobTitle && typeof data.jobTitle === 'string' && data.jobTitle.trim().length > 0);
  const hasDepartment = Boolean(data.departmentId || data.department);
  if (hasJobTitle && hasDepartment) {
    score += 20;
  } else if (hasJobTitle || hasDepartment) {
    score += 10;
  }

  // 4. Contact Reachability (Phone, Email, Location) (20 pts)
  const phone = data.workPhone || data.phone;
  const email = data.workEmail || data.email;
  const hasPhone = Boolean(phone && typeof phone === 'string' && phone.trim().length > 0);
  const hasEmail = Boolean(email && typeof email === 'string' && email.trim().length > 0);
  if (hasPhone && hasEmail) {
    score += 20;
  } else if (hasPhone || hasEmail) {
    score += 10;
  }

  // 5. Digital Presence (Social Links, Skills, Projects) (20 pts)
  const hasSocials = Array.isArray(data.socialLinks) && data.socialLinks.length > 0;
  const hasSkills = Array.isArray(data.skills) && data.skills.length > 0;
  if (hasSocials || hasSkills) {
    if (hasSocials && hasSkills) {
      score += 20;
    } else {
      score += 15;
    }
  }

  return Math.min(100, Math.max(0, score));
}
