import { elapsedMs, finished, pauseState, progressOf, remainingAt, resumeState, startState, tick } from '../logic';
const base = { status: 'running' as const, courseId: null, startedAtMs: 1000, remainingMs: 60_000, targetMs: 60_000 };
it('running elapsed grows with now', () => {
  expect(elapsedMs(base, 1000)).toBe(0);
  expect(elapsedMs({ ...base, remainingMs: 45_000 }, 16_000)).toBe(15_000);
});
it('tick reduces remaining', () => {
  const s = tick(base, 16_000);
  expect(s.remainingMs).toBe(45_000);
  expect(s.startedAtMs).toBe(16_000); // re-anchors so drift doesn't accumulate
});
it('finished at zero', () => {
  expect(finished({ ...base, remainingMs: 0 }, 61_000)).toBe(true);
  expect(finished(base, 1000)).toBe(false);
});
it('progress clamps', () => {
  expect(progressOf(base)).toBe(0);
  expect(progressOf({ ...base, remainingMs: 30_000 })).toBeCloseTo(0.5);
  expect(progressOf({ ...base, remainingMs: 0, startedAtMs: null, status: 'idle' as const })).toBe(1);
});

it('pause then resume keeps elapsed continuity (paused time excluded)', () => {
  let s = startState('c1', 60_000, 0);            // start at t=0
  s = tick(s, 10_000);                            // running: remaining 50s @ t=10s
  s = pauseState(s, 15_000);                      // paused: remaining 45s @ t=15s
  expect(s.status).toBe('paused');
  expect(s.remainingMs).toBe(45_000);
  s = tick(s, 25_000);                            // paused tick: frozen
  expect(s.remainingMs).toBe(45_000);
  s = resumeState(s, 30_000);                     // resume after 15s pause
  expect(s.startedAtMs).toBe(30_000);
  s = tick(s, 40_000);                            // 10s more running
  expect(s.remainingMs).toBe(35_000);
  // Wall clock is 40s but 15s were paused → 25s of study elapsed.
  expect(elapsedMs(s, 40_000)).toBe(25_000);
});

it('finished catches expiry between ticks via anchor projection', () => {
  const s = { ...base, remainingMs: 1_000, startedAtMs: 1_000 };
  expect(finished(s, 1_500)).toBe(false);
  expect(finished(s, 2_000)).toBe(true); // 1s left, 1s of wall clock passed — no tick needed
});

it('paused and idle finish on remainingMs alone', () => {
  expect(finished({ ...base, status: 'paused', remainingMs: 0 }, 999_999)).toBe(true);
  expect(finished({ ...base, status: 'idle', remainingMs: 0, startedAtMs: null }, 0)).toBe(true);
  expect(finished({ ...base, status: 'paused', remainingMs: 5_000 }, 999_999)).toBe(false);
});

it('tick on paused or idle leaves state untouched', () => {
  const paused = { ...base, status: 'paused' as const, remainingMs: 45_000 };
  expect(tick(paused, 16_000)).toBe(paused);
  const idle = { ...base, status: 'idle' as const, startedAtMs: null };
  expect(tick(idle, 16_000)).toBe(idle);
});

it('progress guards non-positive targets', () => {
  expect(progressOf({ ...base, targetMs: 0, remainingMs: 0 })).toBe(1);
  expect(progressOf({ ...base, targetMs: 0, remainingMs: 5_000 })).toBe(0);
});

it('remainingAt projects between ticks while running, freezes when paused', () => {
  expect(remainingAt(base, 11_000)).toBe(50_000);
  expect(remainingAt({ ...base, status: 'paused' }, 11_000)).toBe(60_000);
});
