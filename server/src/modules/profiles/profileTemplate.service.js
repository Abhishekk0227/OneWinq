import { ProfileTemplate } from './profileTemplate.model.js';
import { seedDefaultTemplatesIfEmpty } from './defaultTemplates.js';
import { NotFoundError, ConflictError } from '../../shared/errors.js';

export const profileTemplateService = {
  /**
   * List all active templates for users/onboarding.
   */
  async listTemplates({ includeInactive = false, category = null } = {}) {
    await seedDefaultTemplatesIfEmpty();

    const query = {};
    if (!includeInactive) {
      query.status = 'ACTIVE';
    }
    if (category) {
      query.category = category;
    }

    const templates = await ProfileTemplate.find(query)
      .sort({ displayOrder: 1, createdAt: 1 })
      .lean();

    return templates
      .map((t) => {
        const isUniversal = t.slug === 'professional';
        const isLocked = isUniversal ? false : (t.isLocked !== undefined ? Boolean(t.isLocked) : true);
        return {
          id: t._id.toString(),
          _id: t._id.toString(),
          name: isUniversal ? 'Basic Universal Template' : t.name,
          slug: t.slug,
          description: isUniversal
            ? 'Universal smart profile with fixed essential fields: Bio, Contact Details, and Social Links.'
            : t.description,
          category: t.category,
          recommendedSectionIds: t.recommendedSectionIds || [],
          layoutConfig: t.layoutConfig || {},
          themeConfig: t.themeConfig || {},
          previewImage: t.previewImage,
          status: t.status,
          displayOrder: isUniversal ? 0 : t.displayOrder,
          isFeatured: isUniversal ? true : Boolean(t.isFeatured),
          isLocked,
          comingSoon: isLocked,
        };
      })
      .sort((a, b) => a.displayOrder - b.displayOrder);
  },

  /**
   * Retrieve single template by slug or MongoDB ObjectId.
   */
  async getTemplateBySlugOrId(identifier) {
    await seedDefaultTemplatesIfEmpty();

    const clean = String(identifier).trim();
    let template = null;

    if (/^[0-9a-fA-F]{24}$/.test(clean)) {
      template = await ProfileTemplate.findById(clean);
    }

    if (!template) {
      template = await ProfileTemplate.findOne({ slug: clean.toLowerCase() });
    }

    if (!template) {
      throw new NotFoundError(`Profile template '${identifier}' not found`);
    }

    return template.toSafeObject();
  },

  /**
   * Retrieve the system default template ('professional').
   */
  async getDefaultTemplate() {
    await seedDefaultTemplatesIfEmpty();

    let template = await ProfileTemplate.findOne({ slug: 'professional', status: 'ACTIVE' });
    if (!template) {
      template = await ProfileTemplate.findOne({ status: 'ACTIVE' }).sort({ displayOrder: 1 });
    }
    if (!template) {
      throw new NotFoundError('No active profile templates configured in the system');
    }
    return template;
  },

  // -------------------------------------------------------------------------
  // Admin Template Management
  // -------------------------------------------------------------------------

  /**
   * Admin: List all templates (including inactive) with metadata.
   */
  async adminListTemplates() {
    await seedDefaultTemplatesIfEmpty();
    const templates = await ProfileTemplate.find().sort({ displayOrder: 1, createdAt: 1 }).lean();
    return templates.map((t) => {
      const isUniversal = t.slug === 'professional';
      const isLocked = isUniversal ? false : (t.isLocked !== undefined ? Boolean(t.isLocked) : true);
      return {
        ...t,
        id: t._id.toString(),
        _id: t._id.toString(),
        isLocked,
        comingSoon: isLocked,
      };
    });
  },

  /**
   * Admin: Toggle lock status on a single template.
   */
  async adminToggleLock(id, isLocked) {
    const template = await ProfileTemplate.findById(id);
    if (!template) {
      throw new NotFoundError('Template not found');
    }

    if (template.slug === 'professional' && isLocked) {
      throw new ConflictError('The Basic Universal Template must remain unlocked for all users.');
    }

    template.isLocked = Boolean(isLocked);
    await template.save();
    return template.toSafeObject();
  },

  /**
   * Admin: Bulk lock or unlock templates (either all templates or selected IDs).
   * Note: The Basic Universal Template ('professional') always remains unlocked.
   */
  async adminBulkLock({ isLocked, templateIds = [] } = {}) {
    const filter = { slug: { $ne: 'professional' } };
    if (Array.isArray(templateIds) && templateIds.length > 0) {
      filter._id = { $in: templateIds };
    }

    const result = await ProfileTemplate.updateMany(filter, {
      $set: { isLocked: Boolean(isLocked) },
    });

    return {
      modifiedCount: result.modifiedCount,
      isLocked: Boolean(isLocked),
      message: Boolean(isLocked)
        ? `Successfully locked ${result.modifiedCount} template(s).`
        : `Successfully unlocked ${result.modifiedCount} template(s).`,
    };
  },

  /**
   * Admin: Create a new profile template.
   */
  async adminCreateTemplate(data) {
    const slug = data.slug.toLowerCase().trim();
    const existing = await ProfileTemplate.findOne({ slug });
    if (existing) {
      throw new ConflictError(`A template with slug '${slug}' already exists.`);
    }

    const template = await ProfileTemplate.create({
      name: data.name.trim(),
      slug,
      description: data.description.trim(),
      category: data.category || 'Custom',
      recommendedSectionIds: data.recommendedSectionIds || ['about', 'experience', 'skills'],
      layoutConfig: data.layoutConfig || {},
      themeConfig: data.themeConfig || {},
      previewImage: data.previewImage || null,
      status: data.status || 'ACTIVE',
      displayOrder: data.displayOrder || 0,
      isFeatured: Boolean(data.isFeatured),
      isLocked: data.isLocked !== undefined ? Boolean(data.isLocked) : (slug !== 'professional'),
    });

    return template.toSafeObject();
  },

  /**
   * Admin: Update an existing profile template.
   */
  async adminUpdateTemplate(id, updates) {
    const template = await ProfileTemplate.findById(id);
    if (!template) {
      throw new NotFoundError('Template not found');
    }

    if (updates.slug && updates.slug.toLowerCase() !== template.slug) {
      const slug = updates.slug.toLowerCase().trim();
      const existing = await ProfileTemplate.findOne({ slug, _id: { $ne: id } });
      if (existing) {
        throw new ConflictError(`A template with slug '${slug}' already exists.`);
      }
      template.slug = slug;
    }

    if (updates.name !== undefined) template.name = updates.name.trim();
    if (updates.description !== undefined) template.description = updates.description.trim();
    if (updates.category !== undefined) template.category = updates.category.trim();
    if (updates.recommendedSectionIds !== undefined) template.recommendedSectionIds = updates.recommendedSectionIds;
    if (updates.layoutConfig !== undefined) template.layoutConfig = { ...template.layoutConfig, ...updates.layoutConfig };
    if (updates.themeConfig !== undefined) template.themeConfig = { ...template.themeConfig, ...updates.themeConfig };
    if (updates.previewImage !== undefined) template.previewImage = updates.previewImage || null;
    if (updates.status !== undefined) {
      // Normalize: accept 'active'→ACTIVE, 'draft'/'archived'→INACTIVE, 'ACTIVE'/'INACTIVE' as-is
      const rawStatus = String(updates.status).toUpperCase();
      template.status = rawStatus === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE';
    }
    if (updates.displayOrder !== undefined) template.displayOrder = updates.displayOrder;
    if (updates.isFeatured !== undefined) template.isFeatured = Boolean(updates.isFeatured);
    if (updates.isLocked !== undefined) {
      if (template.slug === 'professional' && updates.isLocked) {
        throw new ConflictError('The Basic Universal Template must remain unlocked for all users.');
      }
      template.isLocked = Boolean(updates.isLocked);
    }

    await template.save();
    return template.toSafeObject();
  },

  /**
   * Admin: Delete or deactivate template.
   */
  async adminDeleteTemplate(id) {
    const template = await ProfileTemplate.findById(id);
    if (!template) {
      throw new NotFoundError('Template not found');
    }

    // Default template cannot be deleted
    if (template.slug === 'professional') {
      throw new ConflictError('The core Professional template cannot be deleted.');
    }

    await ProfileTemplate.findByIdAndDelete(id);
    return { message: 'Template removed successfully' };
  },
};
