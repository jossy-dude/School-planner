import { nextActiveOccurrence, todayOccurrences } from '../selectors';
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
