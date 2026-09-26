import { describe, it, expect } from 'vitest';
import { getRecommendationsForProfessions } from '../../../src/modules/professions/profession.service.js';

describe('profession recommendations', () => {
  it('returns default fallback sections when no profession IDs are provided', async () => {
    const sections = await getRecommendationsForProfessions([]);
    expect(sections).toContain('experience');
    expect(sections).toContain('skills');
    expect(sections).toContain('contact');
  });
});
