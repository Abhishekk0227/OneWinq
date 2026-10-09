import { describe, it, expect } from 'vitest';
import {
  createJobSchema,
  updateJobSchema,
  listJobsQuerySchema,
  applyJobSchema,
  updateApplicationStatusSchema,
} from '../../../src/modules/jobs/job.validation.js';
import {
  EMPLOYMENT_TYPE,
  WORKPLACE_TYPE,
  JOB_STATUS,
  APPLICATION_STATUS,
} from '../../../src/config/constants.js';

describe('Job and Application Validation Unit Tests', () => {
  describe('createJobSchema', () => {
    it('accepts valid job posting with default values', () => {
      const res = createJobSchema.safeParse({
        title: 'Senior Frontend Engineer',
        description: 'We are seeking an experienced React and TypeScript developer to join our growing engineering team.',
      });

      expect(res.success).toBe(true);
      expect(res.data.title).toBe('Senior Frontend Engineer');
      expect(res.data.employmentType).toBe(EMPLOYMENT_TYPE.FULL_TIME);
      expect(res.data.workplaceType).toBe(WORKPLACE_TYPE.ON_SITE);
      expect(res.data.status).toBe(JOB_STATUS.PUBLISHED);
    });

    it('accepts full job details with remote workplace and salary', () => {
      const res = createJobSchema.safeParse({
        title: 'Full Stack Tech Lead',
        description: 'Lead architecture and develop core microservices for high throughput systems.',
        employmentType: EMPLOYMENT_TYPE.CONTRACT,
        workplaceType: WORKPLACE_TYPE.REMOTE,
        salary: {
          min: 2500000,
          max: 3500000,
          currency: 'INR',
          period: 'YEARLY',
          isDisclosed: true,
        },
        skills: ['React', 'Node.js', 'MongoDB', 'Docker'],
        experienceLevel: 'Lead',
      });

      expect(res.success).toBe(true);
      expect(res.data.workplaceType).toBe(WORKPLACE_TYPE.REMOTE);
      expect(res.data.skills).toHaveLength(4);
    });

    it('rejects short title (< 3 chars) and short description (< 20 chars)', () => {
      const res1 = createJobSchema.safeParse({
        title: 'FE',
        description: 'Short desc',
      });
      expect(res1.success).toBe(false);

      const res2 = createJobSchema.safeParse({
        title: 'Valid Title',
        description: 'Too short',
      });
      expect(res2.success).toBe(false);
    });
  });

  describe('applyJobSchema', () => {
    it('accepts valid resume URL and cover letter', () => {
      const res = applyJobSchema.safeParse({
        resumeUrl: 'https://example.com/resumes/john-doe.pdf',
        coverLetter: 'I am excited to apply for this position and bring 5 years of React experience.',
      });
      expect(res.success).toBe(true);
      expect(res.data.coverLetter).toContain('5 years');
    });

    it('accepts application without resume URL (profile snapshot will be used)', () => {
      const res = applyJobSchema.safeParse({});
      expect(res.success).toBe(true);
    });
  });

  describe('updateApplicationStatusSchema', () => {
    it('accepts valid application statuses', () => {
      const statuses = [
        APPLICATION_STATUS.IN_REVIEW,
        APPLICATION_STATUS.SHORTLISTED,
        APPLICATION_STATUS.INTERVIEW_SCHEDULED,
        APPLICATION_STATUS.OFFERED,
        APPLICATION_STATUS.REJECTED,
      ];

      for (const status of statuses) {
        const res = updateApplicationStatusSchema.safeParse({
          status,
          comment: 'Status updated by recruiter',
        });
        expect(res.success).toBe(true);
        expect(res.data.status).toBe(status);
      }
    });

    it('rejects unknown status', () => {
      const res = updateApplicationStatusSchema.safeParse({
        status: 'UNKNOWN_STATUS',
      });
      expect(res.success).toBe(false);
    });
  });
});
