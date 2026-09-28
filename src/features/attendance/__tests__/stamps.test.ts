import { addDaysId, isAttended, statusStamp, weekStartId } from '../logic';

it('stamp vocabulary matches the status', () => {
  expect(statusStamp('present')).toEqual({ text: 'OK', tone: 'ink' });
  expect(statusStamp('absent')).toEqual({ text: 'ABSENT', tone: 'danger' });
  expect(statusStamp('late')).toEqual({ text: 'LATE', tone: 'ink' });
  expect(statusStamp('excused')).toEqual({ text: 'EXCUSED', tone: 'ink' });
});

it('late and excused count as attended, absent does not', () => {
  expect(isAttended('present')).toBe(true);
  expect(isAttended('late')).toBe(true);
  expect(isAttended('excused')).toBe(true);
  expect(isAttended('absent')).toBe(false);
});

it('week start honors the configured first day', () => {
  expect(weekStartId('2026-09-26', 'monday')).toBe('2026-09-21');
  expect(weekStartId('2026-09-26', 'sunday')).toBe('2026-09-20');
});

it('addDaysId steps across the month boundary', () => {
  expect(addDaysId('2026-09-30', 1)).toBe('2026-10-01');
  expect(addDaysId('2026-10-01', -1)).toBe('2026-09-30');
});
