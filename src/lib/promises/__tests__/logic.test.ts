import { promiseProgress, PromiseInput, windowStartMs } from '../logic';

const mon = new Date(2026, 8, 28).getTime(); // Monday
const p: PromiseInput = { id: 'x', courseId: 'c1', subject: 'Maths', targetMin: 60, period: 'week' };

it('sums sessions inside current week window', () => {
  const r = promiseProgress(p, [
    { startedAtMs: mon + 3600_000, durationMin: 30, courseId: 'c1' },
    { startedAtMs: mon - 7 * 86_400_000, durationMin: 45, courseId: 'c1' }, // previous week — excluded
    { startedAtMs: mon + 7200_000, durationMin: 60, courseId: 'c1' },
  ], mon + 86_400_000, 'monday');
  expect(r.doneMin).toBe(90);
  expect(r.targetMin).toBe(60);
  expect(r.ratio).toBe(1); // capped
});

it('filters by course when set', () => {
  const r = promiseProgress(p, [{ startedAtMs: mon + 1000, durationMin: 45, courseId: 'c1' }], mon + 2000, 'monday');
  expect(r.doneMin).toBe(45);
  const none = promiseProgress({ ...p, courseId: 'other' }, [{ startedAtMs: mon + 1000, durationMin: 45, courseId: 'c1' }], mon + 2000, 'monday');
  expect(none.doneMin).toBe(0);
});

it('ratio is uncapped below target', () => {
  const r = promiseProgress(p, [{ startedAtMs: mon + 1000, durationMin: 45, courseId: 'c1' }], mon + 2000, 'monday');
  expect(r.ratio).toBe(0.75);
});

it('day window counts the same local calendar date only (not a rolling 24h window)', () => {
  const dayP: PromiseInput = { ...p, period: 'day' };
  // Just after midnight: sessions from up to a few hours ago already fell off.
  const justAfterMidnight = new Date(2026, 8, 28, 0, 30).getTime();
  const crossed = promiseProgress(dayP, [
    { startedAtMs: new Date(2026, 8, 28, 0, 10).getTime(), durationMin: 20, courseId: 'c1' }, // today, 20 min ago
    { startedAtMs: new Date(2026, 8, 27, 23, 50).getTime(), durationMin: 40, courseId: 'c1' }, // 40 min ago, previous date
    { startedAtMs: new Date(2026, 8, 27, 0, 30).getTime(), durationMin: 60, courseId: 'c1' }, // exactly 24h ago
  ], justAfterMidnight, 'monday');
  expect(crossed.doneMin).toBe(20);
  // Late the same day: a session 22.5h earlier still shares the calendar date.
  const late = new Date(2026, 8, 28, 23, 30).getTime();
  const sameDate = promiseProgress(dayP, [
    { startedAtMs: new Date(2026, 8, 28, 1, 0).getTime(), durationMin: 30, courseId: 'c1' },
  ], late, 'monday');
  expect(sameDate.doneMin).toBe(30);
});

it('week window honours the weekStart sunday boundary', () => {
  const now = new Date(2026, 8, 30, 12).getTime(); // Wed Sep 30
  const sunday = promiseProgress(p, [
    { startedAtMs: new Date(2026, 8, 27, 10).getTime(), durationMin: 20, courseId: 'c1' }, // Sun — boundary day
    { startedAtMs: new Date(2026, 8, 21, 9).getTime(), durationMin: 45, courseId: 'c1' }, // previous Monday
  ], now, 'sunday');
  expect(sunday.doneMin).toBe(20); // Sun in, previous Monday out
  const monday = promiseProgress(p, [
    { startedAtMs: new Date(2026, 8, 27, 10).getTime(), durationMin: 20, courseId: 'c1' },
  ], now, 'monday');
  expect(monday.doneMin).toBe(0); // Sun belongs to the previous week under monday
});

it('counts anonymous sessions only toward all-subjects promises', () => {
  const now = new Date(2026, 8, 28, 12).getTime();
  const anon = { startedAtMs: new Date(2026, 8, 28, 8).getTime(), durationMin: 45 };
  expect(promiseProgress({ ...p, courseId: null }, [anon], now, 'monday').doneMin).toBe(45);
  expect(promiseProgress(p, [anon], now, 'monday').doneMin).toBe(0);
  expect(promiseProgress(p, [{ ...anon, courseId: null }], now, 'monday').doneMin).toBe(0);
});

it('windowStartMs returns local midnight for day and the weekStart boundary for week', () => {
  expect(windowStartMs('day', new Date(2026, 8, 28, 23, 30).getTime(), 'monday'))
    .toBe(new Date(2026, 8, 28).getTime());
  expect(windowStartMs('week', new Date(2026, 8, 30, 12).getTime(), 'monday'))
    .toBe(new Date(2026, 8, 28).getTime());
  expect(windowStartMs('week', new Date(2026, 8, 30, 12).getTime(), 'sunday'))
    .toBe(new Date(2026, 8, 27).getTime());
});
