import { describe, it, expect } from 'vitest';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  listOrganizationsQuerySchema,
} from '../../../src/modules/organizations/organization.validation.js';
import { slugify } from '../../../src/modules/organizations/organization.service.js';
import { ORGANIZATION_TYPE } from '../../../src/config/constants.js';

describe('Organization Validation Unit Tests', () => {
  describe('slugify helper', () => {
    it('converts complex organization name to clean slug', () => {
      expect(slugify('Acme Technologies Pvt. Ltd.')).toBe('acme-technologies-pvt-ltd');
      expect(slugify('Stanford University & College 2026!')).toBe('stanford-university-college-2026');
      expect(slugify('  Trim Spaces  ')).toBe('trim-spaces');
    });
  });

  describe('createOrganizationSchema', () => {
    it('accepts valid organization with minimum required fields', () => {
      const res = createOrganizationSchema.safeParse({ name: 'Acme Corp' });
      expect(res.success).toBe(true);
      expect(res.data.name).toBe('Acme Corp');
      expect(res.data.type).toBe(ORGANIZATION_TYPE.COMPANY);
      expect(res.data.size).toBe('1-10');
      expect(res.data.settings.requireApprovalForCards).toBe(true);
    });

    it('accepts different organization types (College, University, NGO, Hospital)', () => {
      const types = [
        ORGANIZATION_TYPE.COLLEGE,
        ORGANIZATION_TYPE.UNIVERSITY,
        ORGANIZATION_TYPE.HOSPITAL,
        ORGANIZATION_TYPE.NGO,
        ORGANIZATION_TYPE.STARTUP,
        ORGANIZATION_TYPE.OTHER,
      ];

      for (const t of types) {
        const res = createOrganizationSchema.safeParse({
          name: `Sample ${t}`,
          type: t,
        });
        expect(res.success).toBe(true);
        expect(res.data.type).toBe(t);
      }
    });

    it('rejects missing or short name', () => {
      const res1 = createOrganizationSchema.safeParse({});
      expect(res1.success).toBe(false);

      const res2 = createOrganizationSchema.safeParse({ name: 'A' });
      expect(res2.success).toBe(false);
    });

    it('rejects invalid custom slug with uppercase or spaces', () => {
      const res = createOrganizationSchema.safeParse({
        name: 'Valid Name',
        slug: 'Invalid Slug!',
      });
      expect(res.success).toBe(false);
    });
  });

  describe('updateOrganizationSchema', () => {
    it('accepts partial updates', () => {
      const res = updateOrganizationSchema.safeParse({
        tagline: 'Empowering future leaders',
        industry: 'EdTech',
      });
      expect(res.success).toBe(true);
      expect(res.data.tagline).toBe('Empowering future leaders');
      expect(res.data.industry).toBe('EdTech');
    });
  });

  describe('listOrganizationsQuerySchema', () => {
    it('provides sensible defaults for pagination and filters', () => {
      const res = listOrganizationsQuerySchema.safeParse({});
      expect(res.success).toBe(true);
      expect(res.data.page).toBe(1);
      expect(res.data.limit).toBe(20);
    });
  });
});
