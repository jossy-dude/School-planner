import { nextActiveOccurrence, todayOccurrences, weekOccurrences } from '../selectors';
// reuse DAY/at helpers from Task 8 tests
const slice = { patterns: [{ id: 'p1', courseId: 'c1', weekday: 1, startTime: '09:00', endTime: '10:30' }], exceptions: [] };

it('todayOccurrences returns only today rows', () => {
  expect(todayOccurrences(slice, new Date(2026, 8, 28, 8).getTime())).toHaveLength(1);
  expect(todayOccurrences(slice, new Date(2026, 8, 29, 8).getTime())).toHaveLength(0);
});

it('nextActiveOccurrence picks current when active', () => {
  const { current, next } = nextActiveOccurrence(slice, new Date(2026, 8, 28, 9, 30).getTime());
  expect(current?.id).toBe('p1:2026-09-28');
  expect(next).toBeNull();
});

it('nextActiveOccurrence picks next when between classes', () => {
  const { current, next } = nextActiveOccurrence(slice, new Date(2026, 8, 28, 7).getTime());
  expect(current).toBeNull();
  expect(next?.startMs).toBe(new Date(2026, 8, 28, 9).getTime());
});

// ---- review fixes: week range coverage + cross-midnight current ----
const NIGHT = { id: 'pNight', courseId: 'c1', weekday: 1, startTime: '23:00', endTime: '01:00' };
const SUN_00 = { id: 'pSun00', courseId: 'c1', weekday: 0, startTime: '00:00', endTime: '01:00' };
const MON_00 = { id: 'pMon00', courseId: 'c1', weekday: 1, startTime: '00:00', endTime: '01:00' };

const dateIds = (occ: { dateId: string }[]) => occ.map((o) => o.dateId);

it('weekOccurrences mid-week: monday-started week contains this week\'s Monday', () => {
  expect(dateIds(weekOccurrences(slice, new Date(2026, 8, 30, 10).getTime(), 'monday'))).toEqual(['2026-09-28']);
});

it('weekOccurrences mid-week: sunday-started week contains this week\'s Monday', () => {
  expect(dateIds(weekOccurrences(slice, new Date(2026, 8, 30, 10).getTime(), 'sunday'))).toEqual(['2026-09-28']);
});

it('weekOccurrences boundary: on Sunday the monday-started week is the previous week', () => {
  expect(dateIds(weekOccurrences(slice, new Date(2026, 8, 27, 8).getTime(), 'monday'))).toEqual(['2026-09-21']);
});

it('weekOccurrences boundary: on Sunday the sunday-started week starts today', () => {
  expect(dateIds(weekOccurrences(slice, new Date(2026, 8, 27, 8).getTime(), 'sunday'))).toEqual(['2026-09-28']);
});

it('weekOccurrences excludes a 00:00 class on the first day of the next sunday-started week', () => {
  const s = { patterns: [SUN_00], exceptions: [] };
  expect(dateIds(weekOccurrences(s, new Date(2026, 8, 27, 8).getTime(), 'sunday'))).toEqual(['2026-09-27']);
});

it('weekOccurrences excludes a 00:00 class on the first day of the next monday-started week', () => {
  const s = { patterns: [MON_00], exceptions: [] };
  expect(dateIds(weekOccurrences(s, new Date(2026, 8, 27, 8).getTime(), 'monday'))).toEqual(['2026-09-21']);
});

it('nextActiveOccurrence surfaces a session started yesterday still running past midnight', () => {
  const s = { patterns: [NIGHT], exceptions: [] };
  const { current, next } = nextActiveOccurrence(s, new Date(2026, 8, 29, 0, 30).getTime());
  expect(current?.id).toBe('pNight:2026-09-28');
  expect(current?.startMs).toBe(new Date(2026, 8, 28, 23).getTime());
  expect(current?.endMs).toBe(new Date(2026, 8, 29, 1).getTime());
  expect(next).toBeNull();
});
