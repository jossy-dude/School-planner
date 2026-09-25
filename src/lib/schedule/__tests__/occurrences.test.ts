import { classifySessionState, occurrencesOnDay, occurrencesInRange, PatternInput, ExceptionInput } from '../index';

// Helper: build local-time "HH:MM" epoch for 2026-09-28 (Monday, weekday 1)
const DAY = '2026-09-28';
const dayStart = new Date(2026, 8, 28).getTime();
const at = (h: number, m = 0) => dayStart + h * 3600_000 + m * 60_000;

const p1: PatternInput = { id: 'p1', courseId: 'c1', weekday: 1, startTime: '09:00', endTime: '10:30', validFrom: null, validTo: null };

it('emits an occurrence for a matching weekday', () => {
  const occ = occurrencesOnDay([p1], [], DAY);
  expect(occ).toHaveLength(1);
  expect(occ[0]!.startMs).toBe(at(9));
  expect(occ[0]!.endMs).toBe(at(10, 30));
  expect(occ[0]!.id).toBe('p1:2026-09-28');
});

it('no occurrence on other weekdays', () => {
  expect(occurrencesOnDay([p1], [], '2026-09-29')).toHaveLength(0);
});

it('cancelled exception removes the occurrence', () => {
  const ex: ExceptionInput = { id: 'e1', courseId: 'c1', patternId: 'p1', date: DAY, kind: 'cancelled' };
  expect(occurrencesOnDay([p1], [ex], DAY)).toHaveLength(0);
});

it('one_off exception adds a class with explicit times', () => {
  const ex: ExceptionInput = { id: 'e2', courseId: 'c1', date: DAY, kind: 'one_off', startTime: '14:00', endTime: '15:00' };
  const occ = occurrencesOnDay([], [ex], DAY);
  expect(occ).toHaveLength(1);
  expect(occ[0]!.kind).toBe('one_off');
  expect(occ[0]!.startMs).toBe(at(14));
});

it('one_off without times is skipped', () => {
  const ex: ExceptionInput = { id: 'e3', courseId: 'c1', date: DAY, kind: 'one_off' };
  expect(occurrencesOnDay([], [ex], DAY)).toHaveLength(0);
});

it('respects validFrom/validTo window', () => {
  const p: PatternInput = { ...p1, validFrom: '2026-10-01', validTo: '2026-10-31' };
  expect(occurrencesOnDay([p], [], DAY)).toHaveLength(0);
  expect(occurrencesOnDay([p], [], '2026-10-05')).toHaveLength(1);
});

it('crosses midnight when endTime <= startTime (end next day)', () => {
  const p: PatternInput = { ...p1, startTime: '23:00', endTime: '01:00' };
  const [occ] = occurrencesOnDay([p], [], DAY);
  expect(occ!.endMs).toBe(at(25)); // next day 01:00
});

it('classifySessionState buckets by now', () => {
  const occ = occurrencesOnDay([p1], [], DAY)[0]!;
  expect(classifySessionState(at(8), occ)).toBe('upcoming');
  expect(classifySessionState(at(9, 30), occ)).toBe('active');
  expect(classifySessionState(at(11), occ)).toBe('ended');
});

it('occurrencesInRange filters to occurrences starting within [rangeStartMs, rangeEndMs]', () => {
  expect(occurrencesInRange([p1], [], at(15), at(23))).toHaveLength(0);
  expect(occurrencesInRange([p1], [], dayStart, at(8, 59))).toHaveLength(0);
  expect(occurrencesInRange([p1], [], dayStart, at(9))).toHaveLength(1);
  expect(occurrencesInRange([p1], [], dayStart, at(23))).toHaveLength(1);
});
