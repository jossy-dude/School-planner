import { validateGrade } from '../logic';
it('accepts score ≤ max, rejects zero max', () => {
  expect(validateGrade({ title: 'Mid', score: 18, maxScore: 20 }).ok).toBe(true);
  expect(validateGrade({ title: 'Mid', score: 25, maxScore: 20 }).ok).toBe(false);
  expect(validateGrade({ title: 'Mid', score: 5, maxScore: 0 }).ok).toBe(false);
  expect(validateGrade({ title: '', score: 5, maxScore: 10 }).ok).toBe(false);
});

// Extra cases beyond the pinned block: negative scores and whitespace titles
// are rejected by the same natural rule (score >= 0, title non-empty trimmed).
it('rejects negative score and whitespace-only title', () => {
  expect(validateGrade({ title: 'Mid', score: -1, maxScore: 10 }).ok).toBe(false);
  expect(validateGrade({ title: '   ', score: 5, maxScore: 10 }).ok).toBe(false);
});
