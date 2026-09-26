import { ProfessionCategory } from './professionCategory.model.js';
import { Profession } from './profession.model.js';
import { DEFAULT_CATEGORIES } from './defaultTaxonomy.js';
import logger from '../../utils/logger.js';
import { NotFoundError, ConflictError } from '../../shared/errors.js';

/**
 * Seed or synchronize the built-in taxonomy so all default categories & professions exist.
 */
export async function seedDefaultTaxonomyIfEmpty() {
  const officialNormalizedNames = [];

  for (const catData of DEFAULT_CATEGORIES) {
    let category = await ProfessionCategory.findOne({ slug: catData.slug });
    if (!category) {
      category = await ProfessionCategory.create({
        name: catData.name,
        slug: catData.slug,
        icon: catData.icon,
        displayOrder: catData.displayOrder,
      });
    } else {
      category.name = catData.name;
      category.icon = catData.icon;
      category.displayOrder = catData.displayOrder;
      category.isActive = true;
      await category.save();
    }

    for (const profData of catData.professions) {
      const normalizedName = profData.name.trim().toLowerCase();
      officialNormalizedNames.push(normalizedName);

      // Find all matches for this normalizedName (or name case-insensitively)
      const allMatches = await Profession.find({
        $or: [
          { normalizedName },
          { name: new RegExp(`^${profData.name.trim()}$`, 'i') },
        ],
      });

      if (allMatches.length === 0) {
        await Profession.create({
          name: profData.name,
          normalizedName,
          subtitle: profData.subtitle || '',
          aliases: profData.aliases || [],
          categoryId: category._id,
          isOfficial: true,
          isActive: true,
          recommendedSectionTypes: profData.recommendedSectionTypes,
        });
      } else {
        const primary = allMatches.find((m) => m.isOfficial) || allMatches[0];
        primary.name = profData.name;
        primary.normalizedName = normalizedName;
        primary.subtitle = profData.subtitle || '';
        primary.aliases = profData.aliases || [];
        primary.categoryId = category._id;
        primary.recommendedSectionTypes = profData.recommendedSectionTypes;
        primary.isOfficial = true;
        primary.isActive = true;
        await primary.save();

        // Remove any other duplicate documents so duplicate cards never exist
        const duplicateIds = allMatches
          .filter((m) => m._id.toString() !== primary._id.toString())
          .map((m) => m._id);
        if (duplicateIds.length > 0) {
          await Profession.deleteMany({ _id: { $in: duplicateIds } });
        }
      }
    }
  }

  // Deactivate all legacy official professions so only universal ones appear in the catalog
  await Profession.updateMany(
    { isOfficial: true, normalizedName: { $nin: officialNormalizedNames } },
    { $set: { isActive: false } }
  );

  // Deactivate any categories not in DEFAULT_CATEGORIES
  const activeCategorySlugs = DEFAULT_CATEGORIES.map((c) => c.slug);
  await ProfessionCategory.updateMany(
    { slug: { $nin: activeCategorySlugs } },
    { $set: { isActive: false } }
  );
}

/**
 * Retrieve all active categories with optional embedded professions.
 */
export async function getCategories() {
  await seedDefaultTaxonomyIfEmpty();
  const categories = await ProfessionCategory.find({ isActive: { $ne: false } }).sort({ displayOrder: 1 }).lean();
  return categories.map((c) => ({
    id: c._id.toString(),
    _id: c._id.toString(),
    name: c.name,
    slug: c.slug,
    icon: c.icon || '',
    displayOrder: c.displayOrder || 0,
    isActive: c.isActive !== false,
  }));
}

/**
 * Search professions with optional text query and category filter.
 */
export async function searchProfessions({ query = '', category = null, limit = 50 }) {
  await seedDefaultTaxonomyIfEmpty();

  const filter = { isActive: { $ne: false } };

  if (category && typeof category === 'string' && category.trim()) {
    const trimmedCat = category.trim();
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(trimmedCat);
    const cat = await ProfessionCategory.findOne(
      isObjectId ? { $or: [{ slug: trimmedCat }, { _id: trimmedCat }] } : { slug: trimmedCat }
    );
    if (cat) {
      filter.categoryId = cat._id;
    } else {
      return [];
    }
  }

  if (query && typeof query === 'string' && query.trim()) {
    const trimmed = query.trim().toLowerCase();
    filter.$or = [
      { normalizedName: { $regex: trimmed, $options: 'i' } },
      { aliases: { $regex: trimmed, $options: 'i' } },
      { subtitle: { $regex: trimmed, $options: 'i' } },
    ];
  }

  const professions = await Profession.find(filter)
    .sort({ isOfficial: -1, name: 1 })
    .limit(limit)
    .populate('categoryId', 'name slug')
    .lean();

  const seenNames = new Set();
  const uniqueProfessions = [];

  for (const p of professions) {
    const key = (p.normalizedName || p.name || '').trim().toLowerCase();
    if (!key || seenNames.has(key)) continue;
    seenNames.add(key);
    uniqueProfessions.push(p);
  }

  return uniqueProfessions.map((p) => {
    const populatedCat = p.categoryId && typeof p.categoryId === 'object' && p.categoryId._id ? p.categoryId : null;
    return {
      id: p._id.toString(),
      _id: p._id.toString(),
      name: p.name,
      slug: p.slug,
      subtitle: p.subtitle || '',
      aliases: p.aliases || [],
      isOfficial: p.isOfficial,
      isActive: p.isActive !== false,
      categoryId: populatedCat ? populatedCat._id.toString() : (p.categoryId ? p.categoryId.toString() : null),
      category: populatedCat
        ? { id: populatedCat._id.toString(), _id: populatedCat._id.toString(), name: populatedCat.name, slug: populatedCat.slug }
        : null,
      recommendedSectionTypes: p.recommendedSectionTypes || [],
    };
  });
}

/**
 * Create or reuse a custom profession for a user.
 */
export async function createCustomProfession({ name, userId }) {
  const normalizedName = name.trim().toLowerCase();

  // Check if an official profession already exists
  const existingOfficial = await Profession.findOne({ normalizedName, isOfficial: true });
  if (existingOfficial) {
    return existingOfficial.toSafeObject();
  }

  // Check if already created
  let profession = await Profession.findOne({ normalizedName });
  if (!profession) {
    profession = await Profession.create({
      name: name.trim(),
      normalizedName,
      isOfficial: false,
      createdBy: userId,
      recommendedSectionTypes: ['skills', 'experience', 'projects', 'education'],
    });
  }

  return profession.toSafeObject();
}

/**
 * Aggregate and deduplicate recommended section types across multiple profession IDs and custom titles.
 * Supports multi-role professionals (e.g. Engineer + YouTuber / Musician).
 */
export async function getRecommendationsForProfessions(professionIds = [], customTitles = []) {
  const sectionSet = new Set();
  sectionSet.add('contact');

  // 1. Fetch official/catalog professions by ID
  if (Array.isArray(professionIds) && professionIds.length > 0) {
    const professions = await Profession.find({
      _id: { $in: professionIds },
    }).lean();

    for (const prof of professions) {
      if (Array.isArray(prof.recommendedSectionTypes)) {
        for (const s of prof.recommendedSectionTypes) {
          sectionSet.add(s);
        }
      }
    }
  }

  // 2. Fetch or infer recommendations for custom titles (e.g. "YouTuber", "Singer")
  if (Array.isArray(customTitles) && customTitles.length > 0) {
    const normalizedTitles = customTitles
      .filter(Boolean)
      .map((t) => t.trim().toLowerCase());

    if (normalizedTitles.length > 0) {
      // Look up any custom or official professions in DB matching these titles
      const matchedProfessions = await Profession.find({
        normalizedName: { $in: normalizedTitles },
      }).lean();

      for (const prof of matchedProfessions) {
        if (Array.isArray(prof.recommendedSectionTypes)) {
          for (const s of prof.recommendedSectionTypes) {
            sectionSet.add(s);
          }
        }
      }

      // Smart semantic inference for roles not found in DB
      for (const title of normalizedTitles) {
        if (/youtube|video|creator|stream|singer|music|artist|vocal|dj|podcast|film|actor/i.test(title)) {
          sectionSet.add('mediaGallery');
          sectionSet.add('projects');
          sectionSet.add('socialLinks');
          sectionSet.add('services');
        } else if (/doctor|physician|dentist|surgeon|medical|clinic|nurse|therapist|psych/i.test(title)) {
          sectionSet.add('education');
          sectionSet.add('experience');
          sectionSet.add('services');
          sectionSet.add('certifications');
          sectionSet.add('publications');
        } else if (/engineer|developer|programmer|coder|devops|architect|software|frontend|backend/i.test(title)) {
          sectionSet.add('skills');
          sectionSet.add('projects');
          sectionSet.add('experience');
          sectionSet.add('certifications');
        } else if (/founder|ceo|entrepreneur|cofounder|director|executive|partner/i.test(title)) {
          sectionSet.add('organizations');
          sectionSet.add('experience');
          sectionSet.add('services');
          sectionSet.add('speaking');
          sectionSet.add('awards');
        } else if (/lawyer|attorney|advocate|legal|paralegal/i.test(title)) {
          sectionSet.add('experience');
          sectionSet.add('services');
          sectionSet.add('publications');
          sectionSet.add('education');
        } else if (/student|academic|professor|research|scholar|phd/i.test(title)) {
          sectionSet.add('education');
          sectionSet.add('research');
          sectionSet.add('projects');
          sectionSet.add('publications');
          sectionSet.add('skills');
        }
      }
    }
  }

  // If no recommendations resolved, provide default standard set
  if (sectionSet.size <= 1) {
    return ['experience', 'education', 'skills', 'projects', 'contact'];
  }

  return Array.from(sectionSet);
}

// ---------------------------------------------------------------------------
// Admin Category & Profession Management
// ---------------------------------------------------------------------------

export async function adminCreateCategory({ name, slug, icon, displayOrder }) {
  const cleanSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const existing = await ProfessionCategory.findOne({ slug: cleanSlug });
  if (existing) {
    throw new ConflictError('A category with this slug already exists.');
  }

  const category = await ProfessionCategory.create({
    name,
    slug: cleanSlug,
    icon: icon || 'briefcase',
    displayOrder: displayOrder || 0,
  });

  return category.toSafeObject();
}

export async function adminUpdateCategory(categoryId, updates) {
  const category = await ProfessionCategory.findById(categoryId);
  if (!category) {
    throw new NotFoundError('Category not found');
  }

  if (updates.name !== undefined) category.name = updates.name;
  if (updates.slug !== undefined) category.slug = updates.slug;
  if (updates.icon !== undefined) category.icon = updates.icon;
  if (updates.displayOrder !== undefined) category.displayOrder = updates.displayOrder;
  if (updates.isActive !== undefined) category.isActive = updates.isActive;

  await category.save();
  return category.toSafeObject();
}

export async function adminDeleteCategory(categoryId) {
  const category = await ProfessionCategory.findById(categoryId);
  if (!category) {
    throw new NotFoundError('Category not found');
  }
  category.isActive = false;
  await category.save();
  return { message: 'Category deactivated' };
}

export async function adminCreateProfession({ name, subtitle, aliases, categoryId, recommendedSectionTypes, isOfficial = true }) {
  const normalizedName = name.trim().toLowerCase();
  const existing = await Profession.findOne({ normalizedName });
  if (existing) {
    throw new ConflictError('A profession with this name already exists.');
  }

  const profession = await Profession.create({
    name: name.trim(),
    normalizedName,
    subtitle: subtitle || '',
    aliases: Array.isArray(aliases) ? aliases : [],
    categoryId: categoryId || null,
    isOfficial: Boolean(isOfficial),
    recommendedSectionTypes: recommendedSectionTypes || ['experience', 'skills', 'education'],
  });

  return profession.toSafeObject();
}

export async function adminUpdateProfession(professionId, updates) {
  const profession = await Profession.findById(professionId);
  if (!profession) {
    throw new NotFoundError('Profession not found');
  }

  if (updates.name !== undefined) {
    profession.name = updates.name.trim();
    profession.normalizedName = updates.name.trim().toLowerCase();
  }
  if (updates.subtitle !== undefined) profession.subtitle = updates.subtitle;
  if (updates.aliases !== undefined) profession.aliases = Array.isArray(updates.aliases) ? updates.aliases : [];
  if (updates.categoryId !== undefined) profession.categoryId = updates.categoryId || null;
  if (updates.recommendedSectionTypes !== undefined) {
    profession.recommendedSectionTypes = updates.recommendedSectionTypes;
  }
  if (updates.isOfficial !== undefined) profession.isOfficial = updates.isOfficial;
  if (updates.isActive !== undefined) profession.isActive = updates.isActive;

  await profession.save();
  return profession.toSafeObject();
}

export async function adminDeleteProfession(professionId) {
  const profession = await Profession.findById(professionId);
  if (!profession) {
    throw new NotFoundError('Profession not found');
  }
  profession.isActive = false;
  await profession.save();
  return { message: 'Profession deactivated' };
}
