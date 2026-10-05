import { ProfileTemplate } from './profileTemplate.model.js';
import logger from '../../utils/logger.js';

export const DEFAULT_PROFILE_TEMPLATES = [
  {
    name: 'Engineer',
    slug: 'engineer',
    description:
      'Universal engineering profile for all software, systems, cloud, AI, DevOps, and technical disciplines.',
    category: 'Engineering & Tech',
    recommendedSectionIds: [
      'about',
      'skills',
      'projects',
      'experience',
      'certifications',
    ],
    layoutConfig: {
      heroStyle: 'clean',
      cardStyle: 'modern',
    },
    themeConfig: {
      accentColor: '#06B6D4',
      fontPreset: 'inter',
      badgeStyle: 'subtle',
    },
    displayOrder: 1,
    isFeatured: true,
    previewImage: '/templates/engineer.png',
  },
  {
    name: 'Doctor / Healthcare',
    slug: 'doctor',
    description:
      'Universal healthcare profile for physicians, doctors, dentists, clinicians, and medical specialists showcasing clinical background, treatments, and licenses.',
    category: 'Healthcare & Medicine',
    recommendedSectionIds: [
      'about',
      'education',
      'experience',
      'services',
      'certifications',
      'publications',
    ],
    layoutConfig: {
      heroStyle: 'clean',
      cardStyle: 'bordered',
    },
    themeConfig: {
      accentColor: '#0EA5E9',
      fontPreset: 'inter',
      badgeStyle: 'subtle',
    },
    displayOrder: 2,
    isFeatured: true,
    previewImage: '/templates/doctor.png',
  },
  {
    name: 'Founder / Entrepreneur',
    slug: 'founder',
    description:
      'Universal business profile for founders, CEOs, executives, and innovators to highlight ventures, leadership, and advisory offerings.',
    category: 'Ventures & Business',
    recommendedSectionIds: [
      'about',
      'organizations',
      'experience',
      'services',
      'speaking',
      'awards',
    ],
    layoutConfig: {
      heroStyle: 'banner',
      cardStyle: 'glass',
    },
    themeConfig: {
      accentColor: '#8B5CF6',
      fontPreset: 'inter',
      badgeStyle: 'subtle',
    },
    displayOrder: 3,
    isFeatured: true,
    previewImage: '/templates/founder.png',
  },
  {
    name: 'Creator / Designer',
    slug: 'creator',
    description:
      'Universal creative identity for content creators, designers, artists, and media professionals to showcase channels, visual works, and collaborations.',
    category: 'Media & Creative',
    recommendedSectionIds: [
      'about',
      'mediaGallery',
      'projects',
      'services',
      'socialLinks',
    ],
    layoutConfig: {
      heroStyle: 'media',
      cardStyle: 'modern',
    },
    themeConfig: {
      accentColor: '#EC4899',
      fontPreset: 'inter',
      badgeStyle: 'subtle',
    },
    displayOrder: 4,
    isFeatured: true,
    previewImage: '/templates/creator.png',
  },
  {
    name: 'Student / Academic',
    slug: 'student',
    description:
      'Universal academic profile for students, scholars, professors, and researchers showcasing academic credentials, GPA, research, and coursework.',
    category: 'Academia & Education',
    recommendedSectionIds: [
      'about',
      'education',
      'projects',
      'skills',
      'certifications',
      'research',
    ],
    layoutConfig: {
      heroStyle: 'split',
      cardStyle: 'modern',
    },
    themeConfig: {
      accentColor: '#10B981',
      fontPreset: 'inter',
      badgeStyle: 'subtle',
    },
    displayOrder: 5,
    isFeatured: true,
    previewImage: '/templates/student.png',
  },
  {
    name: 'CEO / Executive',
    slug: 'executive',
    description:
      'A leadership-focused profile for executives, CEOs, business leaders, and board directors.',
    category: 'Executive & Leadership',
    recommendedSectionIds: [
      'about',
      'experience',
      'organizations',
      'speaking',
      'awards',
      'education',
    ],
    layoutConfig: {
      heroStyle: 'banner',
      cardStyle: 'bordered',
    },
    themeConfig: {
      accentColor: '#0F172A',
      fontPreset: 'inter',
      badgeStyle: 'minimal',
    },
    displayOrder: 6,
    isFeatured: false,
    previewImage: '/templates/executive.png',
  },
  {
    name: 'Academic Researcher',
    slug: 'academic',
    description:
      'Designed for professors, faculty members, researchers, and academic professionals.',
    category: 'Academia & Education',
    recommendedSectionIds: [
      'about',
      'education',
      'research',
      'publications',
      'courses',
      'speaking',
      'awards',
    ],
    layoutConfig: {
      heroStyle: 'clean',
      cardStyle: 'bordered',
    },
    themeConfig: {
      accentColor: '#D97706',
      fontPreset: 'inter',
      badgeStyle: 'subtle',
    },
    displayOrder: 7,
    isFeatured: false,
    previewImage: '/templates/academic.png',
  },
  {
    name: 'Freelancer / Consultant',
    slug: 'freelancer-consultant',
    description:
      'Designed for independent professionals who provide client services or consulting packages.',
    category: 'Consulting & Services',
    recommendedSectionIds: [
      'about',
      'services',
      'experience',
      'projects',
      'skills',
      'certifications',
    ],
    layoutConfig: {
      heroStyle: 'split',
      cardStyle: 'modern',
    },
    themeConfig: {
      accentColor: '#F59E0B',
      fontPreset: 'inter',
      badgeStyle: 'subtle',
    },
    displayOrder: 9,
    isFeatured: false,
    previewImage: '/templates/freelancer-consultant.png',
  },
  {
    name: 'Basic Universal Template',
    slug: 'professional',
    description:
      'Universal smart profile with fixed essential fields: Bio, Contact Details, and Social Links.',
    category: 'Universal & Custom',
    recommendedSectionIds: [
      'about',
      'contact',
      'socialLinks',
      'experience',
      'skills',
      'projects',
      'education',
    ],
    layoutConfig: {
      heroStyle: 'clean',
      cardStyle: 'modern',
    },
    themeConfig: {
      accentColor: '#3B82F6',
      fontPreset: 'inter',
      badgeStyle: 'subtle',
    },
    displayOrder: 1,
    isFeatured: true,
    isLocked: false,
    previewImage: '/templates/professional.png',
  },
];

/**
 * Ensures all default profile templates are seeded.
 * Only creates templates that don't exist yet — never overwrites admin edits.
 */
export async function seedDefaultTemplatesIfEmpty() {
  for (const tpl of DEFAULT_PROFILE_TEMPLATES) {
    const existing = await ProfileTemplate.findOne({ slug: tpl.slug });
    if (!existing) {
      await ProfileTemplate.create({
        ...tpl,
        status: 'ACTIVE',
        isLocked: tpl.slug === 'professional' ? false : (tpl.isLocked !== undefined ? tpl.isLocked : true),
      });
      logger.info(`[ProfileTemplate] Seeded default template: ${tpl.name} (${tpl.slug})`);
    } else {
      let changed = false;
      if (tpl.slug === 'professional') {
        if (existing.name !== 'Basic Universal Template') {
          existing.name = 'Basic Universal Template';
          existing.description = 'Universal smart profile with fixed essential fields: Bio, Contact Details, and Social Links.';
          existing.isFeatured = true;
          existing.displayOrder = 1;
          changed = true;
        }
        if (existing.isLocked !== false) {
          existing.isLocked = false;
          changed = true;
        }
        if (existing.previewImage !== tpl.previewImage) {
          existing.previewImage = tpl.previewImage;
          changed = true;
        }
      } else if (existing.isLocked === undefined) {
        existing.isLocked = true;
        changed = true;
      }

      if (tpl.previewImage && existing.previewImage !== tpl.previewImage) {
        existing.previewImage = tpl.previewImage;
        changed = true;
      }

      if (changed) {
        await existing.save();
      }
    }
  }
}
