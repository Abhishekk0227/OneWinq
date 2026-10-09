import { describe, it, expect } from 'vitest';
import { calculateProfileCompletionScore } from '../../../src/modules/organizations/profileScore.util.js';
import { calculateObjectDiff } from '../../../src/utils/objectDiff.util.js';

describe('calculateProfileCompletionScore', () => {
  it('returns 0 for empty profile data', () => {
    expect(calculateProfileCompletionScore(null)).toBe(0);
    expect(calculateProfileCompletionScore(undefined)).toBe(0);
    expect(calculateProfileCompletionScore({})).toBe(0);
  });

  it('calculates weighted score accurately', () => {
    const fullData = {
      avatarUrl: 'https://cdn.example.com/photo.jpg',
      displayName: 'Alex Smith',
      headline: 'Principal Engineer',
      bio: 'Over a decade of high-scale backend experience.',
      jobTitle: 'VP of Engineering',
      departmentId: 'dept-12345',
      workEmail: 'lead@corp.com',
      workPhone: '+1-555-0199',
      socialLinks: [{ platform: 'github', url: 'https://github.com/lead' }],
      skills: ['Distributed Systems', 'Node.js'],
    };

    const score = calculateProfileCompletionScore(fullData);
    expect(score).toBe(100);
  });

  it('calculates partial score correctly', () => {
    const partialData = {
      avatarUrl: 'https://cdn.example.com/photo.jpg', // 20
      jobTitle: 'Staff Engineer', // 10 (no department yet)
    };
    expect(calculateProfileCompletionScore(partialData)).toBe(30);
  });
});

describe('calculateObjectDiff', () => {
  it('detects added, changed, and removed fields', () => {
    const oldObj = {
      title: 'Senior Engineer',
      department: 'Engineering',
      location: 'SF',
    };
    const newObj = {
      title: 'Principal Engineer',
      department: 'Engineering',
      bio: 'New bio added',
    };

    const diff = calculateObjectDiff(oldObj, newObj);

    // Diff is an array of { field, oldValue, newValue }
    expect(diff).toContainEqual({ field: 'title', oldValue: 'Senior Engineer', newValue: 'Principal Engineer' });
    expect(diff).toContainEqual({ field: 'bio', oldValue: null, newValue: 'New bio added' });
    expect(diff).toContainEqual({ field: 'location', oldValue: 'SF', newValue: null });

    const deptDiff = diff.find((d) => d.field === 'department');
    expect(deptDiff).toBeUndefined(); // unchanged
  });
});
