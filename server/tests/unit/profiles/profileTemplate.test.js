import { describe, it, expect, vi, beforeEach } from 'vitest';
import { profileTemplateService } from '../../../src/modules/profiles/profileTemplate.service.js';
import { ProfileTemplate } from '../../../src/modules/profiles/profileTemplate.model.js';
import { Profile } from '../../../src/modules/profiles/profile.model.js';
import { ProfessionalIdentity } from '../../../src/modules/profiles/professionalIdentity.model.js';
import * as profileService from '../../../src/modules/profiles/profile.service.js';
import * as professionService from '../../../src/modules/professions/profession.service.js';
import { DEFAULT_PROFILE_TEMPLATES } from '../../../src/modules/profiles/defaultTemplates.js';

describe('Profile Templates & Multi-Role Recommendations Engine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Template Catalog Requirements', () => {
    it('contains at least the 8 mandatory initial templates', () => {
      const requiredSlugs = [
        'professional',
        'student',
        'founder',
        'executive',
        'engineer',
        'creator',
        'academic',
        'freelancer-consultant',
      ];

      const seededSlugs = DEFAULT_PROFILE_TEMPLATES.map((t) => t.slug);
      for (const slug of requiredSlugs) {
        expect(seededSlugs).toContain(slug);
      }
      expect(DEFAULT_PROFILE_TEMPLATES.length).toBeGreaterThanOrEqual(8);
    });

    it('each template defines recommended section IDs and valid configuration', () => {
      for (const tpl of DEFAULT_PROFILE_TEMPLATES) {
        expect(tpl.name).toBeDefined();
        expect(tpl.slug).toMatch(/^[a-z0-9-]+$/);
        expect(tpl.description.length).toBeGreaterThan(10);
        expect(Array.isArray(tpl.recommendedSectionIds)).toBe(true);
        expect(tpl.recommendedSectionIds.length).toBeGreaterThan(0);
        expect(tpl.layoutConfig).toBeDefined();
        expect(tpl.themeConfig).toBeDefined();
      }
    });
  });

  describe('Dynamic Recommendation Engine (Template + Multiple Roles)', () => {
    const userId = '60c72b2f9b1d8b2bad000001';

    it('combines template recommendations + multiple role recommendations without duplicates and preserves order', async () => {
      const mockFounderTemplate = {
        _id: 'tpl_founder_1',
        name: 'Founder',
        slug: 'founder',
        description: 'Founder identity',
        recommendedSectionIds: [
          'about',
          'experience',
          'organizations',
          'services',
          'projects',
          'achievements',
          'socialLinks',
        ],
        toSafeObject() {
          return { ...this };
        },
      };

      const mockProfile = {
        _id: 'prof_1',
        userId,
        templateId: mockFounderTemplate,
        bio: 'Tech founder and engineer',
        headline: 'Founder @ Acme',
        experience: [{ company: 'Acme', role: 'Founder' }],
        skills: [{ name: 'System Design' }],
        projects: [],
      };

      vi.spyOn(Profile, 'findOne').mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockProfile),
      });

      // User has 2 professional identities: Software Engineer and Founder
      const mockIdentities = [
        { professionId: 'prof_eng', customTitle: 'Software Engineer', isPrimary: false },
        { professionId: 'prof_founder', customTitle: 'Founder', isPrimary: true },
      ];

      vi.spyOn(ProfessionalIdentity, 'find').mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockIdentities),
      });

      // Roles contribute additional sections (e.g. skills, certifications)
      vi.spyOn(professionService, 'getRecommendationsForProfessions').mockResolvedValue([
        'skills',
        'experience',
        'projects',
        'certifications',
        'services',
        'achievements',
        'organizations',
      ]);

      const result = await profileService.getProfileRecommendations(userId);

      expect(result.template.slug).toBe('founder');
      expect(result.templateRecommendations).toEqual([
        'about',
        'experience',
        'organizations',
        'services',
        'projects',
        'achievements',
        'socialLinks',
      ]);

      // Combined recommendations must contain all template recommendations + role recommendations without duplicates
      expect(result.combinedRecommendations).toContain('about');
      expect(result.combinedRecommendations).toContain('experience');
      expect(result.combinedRecommendations).toContain('organizations');
      expect(result.combinedRecommendations).toContain('services');
      expect(result.combinedRecommendations).toContain('projects');
      expect(result.combinedRecommendations).toContain('achievements');
      expect(result.combinedRecommendations).toContain('socialLinks');
      expect(result.combinedRecommendations).toContain('skills');
      expect(result.combinedRecommendations).toContain('certifications');

      // Check no duplicates in combinedRecommendations
      const uniqueSet = new Set(result.combinedRecommendations);
      expect(uniqueSet.size).toBe(result.combinedRecommendations.length);

      // Check existing sections detection
      expect(result.existingSections).toContain('about');
      expect(result.existingSections).toContain('experience');
      expect(result.existingSections).toContain('skills');

      // Missing recommended sections should not include existing sections
      expect(result.missingRecommendedSections).not.toContain('about');
      expect(result.missingRecommendedSections).not.toContain('experience');
      expect(result.missingRecommendedSections).not.toContain('skills');
      expect(result.missingRecommendedSections).toContain('organizations');
      expect(result.missingRecommendedSections).toContain('certifications');
    });
  });

  describe('updateProfileTemplate — Preserving Existing Profile Content', () => {
    const userId = '60c72b2f9b1d8b2bad000001';

    it('switches template while preserving all existing profile data intact', async () => {
      const mockEngineerTemplate = {
        _id: 'tpl_engineer_1',
        name: 'Engineer',
        slug: 'engineer',
        recommendedSectionIds: ['about', 'experience', 'skills', 'projects', 'education'],
        toSafeObject() {
          return { ...this };
        },
      };

      const existingServices = [{ id: 'srv1', title: 'Consulting' }];
      const existingCustomSections = [{ id: 'c1', title: 'Patents' }];

      const mockProfile = {
        _id: 'prof_1',
        userId,
        templateId: 'tpl_founder_old',
        bio: 'My bio',
        services: existingServices,
        customSections: existingCustomSections,
        experience: [{ company: 'Google', role: 'Dev' }],
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(Profile, 'findOne').mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockProfile),
      });

      const mockUniversalTemplate = {
        _id: 'tpl_professional_1',
        name: 'Basic Universal Template',
        slug: 'professional',
        recommendedSectionIds: ['about', 'contact', 'socialLinks', 'experience', 'skills'],
        toSafeObject() {
          return { ...this };
        },
      };

      vi.spyOn(profileTemplateService, 'getTemplateBySlugOrId').mockImplementation(async (slug) => {
        if (slug === 'engineer') return mockEngineerTemplate;
        return mockUniversalTemplate;
      });

      vi.spyOn(ProfessionalIdentity, 'find').mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      });

      // Locked template should throw ValidationError
      await expect(
        profileService.updateProfileTemplate(userId, {
          templateSlug: 'engineer',
        })
      ).rejects.toThrow(/locked and coming soon/);

      // Switching to Basic Universal Template should succeed and preserve data
      const result = await profileService.updateProfileTemplate(userId, {
        templateSlug: 'professional',
      });

      expect(mockProfile.templateId._id || mockProfile.templateId).toBe(mockUniversalTemplate._id);
      expect(mockProfile.save).toHaveBeenCalled();

      // Crucial: Existing services and custom sections are NOT deleted!
      expect(mockProfile.services).toEqual(existingServices);
      expect(mockProfile.customSections).toEqual(existingCustomSections);
      expect(result.template.slug).toBe('professional');
    });
  });

  describe('Multiple Professional Identities Persistence', () => {
    const userId = '60c72b2f9b1d8b2bad000001';

    it('supports multiple roles with exactly one primary and preserves secondary roles', async () => {
      const identities = [
        { _id: 'id1', userId, customTitle: 'Software Engineer', isPrimary: true, displayOrder: 0 },
        { _id: 'id2', userId, customTitle: 'Founder', isPrimary: false, displayOrder: 1 },
        { _id: 'id3', userId, customTitle: 'Content Creator', isPrimary: false, displayOrder: 2 },
      ];

      vi.spyOn(ProfessionalIdentity, 'find').mockReturnValue({
        sort: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(identities),
          }),
        }),
      });

      const userIdentities = await profileService.getUserIdentities(userId);
      expect(userIdentities).toHaveLength(3);
      expect(userIdentities.filter((i) => i.isPrimary)).toHaveLength(1);
      expect(userIdentities[0].customTitle).toBe('Software Engineer');
      expect(userIdentities[1].customTitle).toBe('Founder');
      expect(userIdentities[2].customTitle).toBe('Content Creator');
    });
  });

  describe('Admin Template Lock & Unlock Controls', () => {
    it('adminToggleLock toggles isLocked status and returns safe object', async () => {
      const mockDoc = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Engineer',
        slug: 'engineer',
        isLocked: true,
        save: vi.fn().mockResolvedValue(true),
        toSafeObject() {
          return { id: this._id, name: this.name, slug: this.slug, isLocked: this.isLocked, comingSoon: this.isLocked };
        },
      };

      vi.spyOn(ProfileTemplate, 'findById').mockResolvedValue(mockDoc);

      const updated = await profileTemplateService.adminToggleLock('507f1f77bcf86cd799439011', false);
      expect(mockDoc.isLocked).toBe(false);
      expect(mockDoc.save).toHaveBeenCalled();
      expect(updated.isLocked).toBe(false);
    });

    it('adminToggleLock prevents locking the Basic Universal Template (professional)', async () => {
      const mockUniversal = {
        _id: '507f1f77bcf86cd799439099',
        name: 'Basic Universal Template',
        slug: 'professional',
        isLocked: false,
      };

      vi.spyOn(ProfileTemplate, 'findById').mockResolvedValue(mockUniversal);

      await expect(
        profileTemplateService.adminToggleLock('507f1f77bcf86cd799439099', true)
      ).rejects.toThrow(/Basic Universal Template must remain unlocked/);
    });

    it('adminBulkLock updates all templates excluding universal when no IDs passed', async () => {
      vi.spyOn(ProfileTemplate, 'updateMany').mockResolvedValue({ modifiedCount: 7 });

      const result = await profileTemplateService.adminBulkLock({ isLocked: false });
      expect(ProfileTemplate.updateMany).toHaveBeenCalledWith(
        { slug: { $ne: 'professional' } },
        { $set: { isLocked: false } }
      );
      expect(result.modifiedCount).toBe(7);
      expect(result.isLocked).toBe(false);
    });

    it('adminBulkLock updates specific template IDs when provided', async () => {
      const ids = ['id_1', 'id_2'];
      vi.spyOn(ProfileTemplate, 'updateMany').mockResolvedValue({ modifiedCount: 2 });

      const result = await profileTemplateService.adminBulkLock({ isLocked: true, templateIds: ids });
      expect(ProfileTemplate.updateMany).toHaveBeenCalledWith(
        { slug: { $ne: 'professional' }, _id: { $in: ids } },
        { $set: { isLocked: true } }
      );
      expect(result.modifiedCount).toBe(2);
      expect(result.isLocked).toBe(true);
    });
  });
});

