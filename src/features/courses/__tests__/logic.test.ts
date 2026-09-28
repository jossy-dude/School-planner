import { validateCourse } from '../logic';

it('accepts a minimal course and fills defaults', () => {
  const r = validateCourse({ name: 'Maths', credits: 3, defaultDurationMin: 60 });
  expect(r.ok).toBe(true);
  if (r.ok) {
    expect(r.value.emoji).toBe('📘');
    expect(r.value.pattern).toBe('dots');
    expect(r.value.color).toBe('#141414');
  }
});

it('rejects empty name and negative credits', () => {
  expect(validateCourse({ name: '  ', credits: 1 }).ok).toBe(false);
  expect(validateCourse({ name: 'Maths', credits: -1 }).ok).toBe(false);
});

it('rejects duration under 5 minutes', () => {
  expect(validateCourse({ name: 'Maths', defaultDurationMin: 4 }).ok).toBe(false);
});

it('defaults invalid pattern/color to safe values', () => {
  const r = validateCourse({ name: 'Art', pattern: 'zigzag' as never, color: 'not-a-color' });
  expect(r.ok).toBe(true);
  if (r.ok) { expect(r.value.pattern).toBe('dots'); expect(r.value.color).toBe('#141414'); }
});
