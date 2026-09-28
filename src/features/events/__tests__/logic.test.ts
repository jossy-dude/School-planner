import { tMinusLabel, validateEvent } from '../logic';
const now = new Date(2026, 8, 25, 8).getTime();
it('labels ranges', () => {
  expect(tMinusLabel(now + 6 * 86_400_000, now)).toBe('T-6D');
  expect(tMinusLabel(now + 5 * 3600_000, now)).toBe('T-5H');
  expect(tMinusLabel(now + 30 * 60_000, now)).toBe('T-30M');
  expect(tMinusLabel(now - 1000, now)).toBe('OVERDUE');
  expect(tMinusLabel(now + 90 * 60_000, now)).toBe('T-2H');
});
it('validates title and due', () => {
  expect(validateEvent({ title: 'Essay', dueAtMs: now }).ok).toBe(true);
  expect(validateEvent({ title: '', dueAtMs: now }).ok).toBe(false);
  expect(validateEvent({ title: 'Essay' }).ok).toBe(false);
  expect(validateEvent({ title: 'Essay', dueAtMs: now, kind: 'bogus' as never }).ok).toBe(false);
});
