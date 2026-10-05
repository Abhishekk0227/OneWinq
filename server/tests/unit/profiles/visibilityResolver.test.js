import { describe, it, expect } from 'vitest';
import {
  resolveEffectiveMode,
  filterProfileByVisibility,
} from '../../../src/modules/profiles/visibilityResolver.js';
import {
  VISIBILITY_MODE,
  SECTION_VISIBILITY,
} from '../../../src/config/constants.js';

describe('visibilityResolver', () => {
  describe('resolveEffectiveMode', () => {
    it('returns PUBLIC when profile is null or undefined', () => {
      expect(resolveEffectiveMode(null)).toBe(VISIBILITY_MODE.PUBLIC);
      expect(resolveEffectiveMode({})).toBe(VISIBILITY_MODE.PUBLIC);
    });

    it('returns activeMode when no temporary mode is set', () => {
      const profile = { activeMode: VISIBILITY_MODE.PROFESSIONAL };
      expect(resolveEffectiveMode(profile)).toBe(VISIBILITY_MODE.PROFESSIONAL);
    });

    it('returns temporaryMode when it has not expired', () => {
      const profile = {
        activeMode: VISIBILITY_MODE.PUBLIC,
        temporaryMode: {
          mode: VISIBILITY_MODE.PRIVATE,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour in future
          fallbackMode: VISIBILITY_MODE.PUBLIC,
        },
      };
      expect(resolveEffectiveMode(profile)).toBe(VISIBILITY_MODE.PRIVATE);
    });

    it('returns fallbackMode when temporaryMode has expired', () => {
      const profile = {
        activeMode: VISIBILITY_MODE.PUBLIC,
        temporaryMode: {
          mode: VISIBILITY_MODE.PRIVATE,
          expiresAt: new Date(Date.now() - 60 * 1000), // 1 minute in past
          fallbackMode: VISIBILITY_MODE.PROFESSIONAL,
        },
      };
      expect(resolveEffectiveMode(profile)).toBe(VISIBILITY_MODE.PROFESSIONAL);
    });
  });

  describe('filterProfileByVisibility', () => {
    const sampleProfile = {
      headline: 'Senior Cloud Architect',
      bio: 'Over 10 years of building scalable systems.',
      avatarUrl: 'https://example.com/avatar.jpg',
      avatarVisibility: SECTION_VISIBILITY.PUBLIC,
      coverUrl: 'https://example.com/cover.jpg',
      activeMode: VISIBILITY_MODE.PUBLIC,
      location: { city: 'San Francisco', state: 'CA', country: 'USA', isRemote: true },
      contact: {
        email: 'public@example.com',
        phone: '+1-555-0199',
        website: 'https://example.com',
        address: '123 Secret Lane',
      },
      socialLinks: [{ id: '1', platform: 'github', url: 'https://github.com/user' }],
      experience: [{ id: 'exp1', company: 'Acme', role: 'Architect' }],
      services: [{ id: 'srv1', title: 'Consulting', priceRange: '$$$' }],
      customSections: [
        {
          id: 'cs1',
          title: 'My Hobbies',
          blocks: [{ type: 'text', content: 'Photography' }],
          displayOrder: 0,
        },
      ],
      sectionVisibility: {
        about: SECTION_VISIBILITY.PUBLIC,
        location: SECTION_VISIBILITY.PUBLIC,
        contact: SECTION_VISIBILITY.PUBLIC,
        experience: SECTION_VISIBILITY.PUBLIC,
        services: SECTION_VISIBILITY.PROFESSIONAL, // only in professional mode
        custom_cs1: SECTION_VISIBILITY.PRIVATE, // only in private mode
      },
      fieldVisibility: {
        'contact.email': SECTION_VISIBILITY.PUBLIC,
        'contact.website': SECTION_VISIBILITY.PUBLIC,
        'contact.phone': SECTION_VISIBILITY.PROFESSIONAL,
        'contact.address': SECTION_VISIBILITY.PRIVATE,
      },
      sectionOrder: ['about', 'experience', 'services', 'custom_cs1'],
    };

    it('filters content accurately in PUBLIC mode', () => {
      const result = filterProfileByVisibility(sampleProfile, VISIBILITY_MODE.PUBLIC);

      expect(result.effectiveMode).toBe(VISIBILITY_MODE.PUBLIC);
      expect(result.headline).toBe('Senior Cloud Architect');
      expect(result.bio).toBe('Over 10 years of building scalable systems.');
      expect(result.avatarUrl).toBe('https://example.com/avatar.jpg');

      // Experience is public -> present
      expect(result.sections.experience).toBeDefined();
      expect(result.sections.experience).toHaveLength(1);

      // Services is professional -> absent in public mode
      expect(result.sections.services).toBeUndefined();

      // Custom section is private -> absent in public mode
      expect(result.customSections).toHaveLength(0);

      // Contact fields: email & website are public; phone & address are stripped
      expect(result.contact).toEqual({
        email: 'public@example.com',
        website: 'https://example.com',
      });
      expect(result.contact.phone).toBeUndefined();
      expect(result.contact.address).toBeUndefined();
    });

    it('filters content accurately in PROFESSIONAL mode', () => {
      const result = filterProfileByVisibility(sampleProfile, VISIBILITY_MODE.PROFESSIONAL);

      expect(result.effectiveMode).toBe(VISIBILITY_MODE.PROFESSIONAL);
      // Both public and professional sections visible
      expect(result.sections.experience).toBeDefined();
      expect(result.sections.services).toBeDefined();
      expect(result.sections.services).toHaveLength(1);

      // Private custom section still absent
      expect(result.customSections).toHaveLength(0);

      // Phone is professional -> now included; address is private -> still stripped
      expect(result.contact.phone).toBe('+1-555-0199');
      expect(result.contact.address).toBeUndefined();
    });

    it('filters content accurately in PRIVATE mode', () => {
      const privateProfile = {
        ...sampleProfile,
        sectionVisibility: {
          ...sampleProfile.sectionVisibility,
          contact: SECTION_VISIBILITY.PRIVATE,
        },
      };
      const result = filterProfileByVisibility(privateProfile, VISIBILITY_MODE.PRIVATE);

      expect(result.effectiveMode).toBe(VISIBILITY_MODE.PRIVATE);
      // In private mode, items configured for PRIVATE are visible
      expect(result.customSections).toHaveLength(1);
      expect(result.customSections[0].title).toBe('My Hobbies');

      // Address is configured for private -> included
      expect(result.contact.address).toBe('123 Secret Lane');
    });

    it('hides avatar when avatarVisibility does not match', () => {
      const hiddenAvatarProfile = {
        ...sampleProfile,
        avatarVisibility: SECTION_VISIBILITY.PRIVATE,
      };

      const publicResult = filterProfileByVisibility(hiddenAvatarProfile, VISIBILITY_MODE.PUBLIC);
      expect(publicResult.avatarUrl).toBeNull();

      const privateResult = filterProfileByVisibility(hiddenAvatarProfile, VISIBILITY_MODE.PRIVATE);
      expect(privateResult.avatarUrl).toBe('https://example.com/avatar.jpg');
    });

    it('supports array-based visibility across multiple modes', () => {
      const multiModeProfile = {
        ...sampleProfile,
        sectionVisibility: {
          ...sampleProfile.sectionVisibility,
          experience: ['PUBLIC', 'PROFESSIONAL'],
          services: ['PROFESSIONAL', 'PRIVATE'],
        },
      };

      const publicRes = filterProfileByVisibility(multiModeProfile, VISIBILITY_MODE.PUBLIC);
      expect(publicRes.sections.experience).toBeDefined();
      expect(publicRes.sections.services).toBeUndefined();

      const profRes = filterProfileByVisibility(multiModeProfile, VISIBILITY_MODE.PROFESSIONAL);
      expect(profRes.sections.experience).toBeDefined();
      expect(profRes.sections.services).toBeDefined();

      const privateRes = filterProfileByVisibility(multiModeProfile, VISIBILITY_MODE.PRIVATE);
      expect(privateRes.sections.experience).toBeDefined(); // public baseline included
      expect(privateRes.sections.services).toBeDefined(); // explicitly included in PRIVATE
    });

    it('applies modeData overrides when configured for effective mode', () => {
      const overrideProfile = {
        ...sampleProfile,
        bio: 'Universal standard bio',
        headline: 'General Architect',
        modeData: {
          PROFESSIONAL: {
            bio: 'Senior Executive Consultant with 15+ years experience',
            headline: 'Principal Enterprise Consultant',
          },
        },
      };

      const publicRes = filterProfileByVisibility(overrideProfile, VISIBILITY_MODE.PUBLIC);
      expect(publicRes.bio).toBe('Universal standard bio');
      expect(publicRes.headline).toBe('General Architect');

      const profRes = filterProfileByVisibility(overrideProfile, VISIBILITY_MODE.PROFESSIONAL);
      expect(profRes.bio).toBe('Senior Executive Consultant with 15+ years experience');
      expect(profRes.headline).toBe('Principal Enterprise Consultant');
    });
  });
});
