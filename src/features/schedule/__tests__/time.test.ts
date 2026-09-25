import { normalizeTime, isValidTime } from '../logic';
it('validates HH:MM', () => {
  expect(isValidTime('09:00')).toBe(true);
  expect(isValidTime('23:59')).toBe(true);
  expect(isValidTime('24:00')).toBe(false);
  expect(isValidTime('9:0')).toBe(false);
});
it('normalize pads input', () => {
  expect(normalizeTime('95')).toBe('09:05');
  expect(normalizeTime('')).toBe('');
});
