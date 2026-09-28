// Pure study-promise progress math. Zero imports (RN-free) so it runs anywhere.

export interface PromiseInput {
  id: string;
  courseId: string | null;
  subject: string;
  targetMin: number;
  period: 'day' | 'week';
}

export interface PromiseSession {
  startedAtMs: number;
  durationMin: number;
  courseId?: string | null;
}

export type WeekStart = 'sunday' | 'monday';

const pad = (n: number) => String(n).padStart(2, '0');

// toDateId-style local calendar date (YYYY-MM-DD). Window membership compares
// these strings, never raw ms deltas, so DST shifts cannot move a session
// across a day/week boundary.
function dateIdOf(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function weekStartDate(nowMs: number, weekStart: WeekStart): Date {
  const d = new Date(nowMs);
  const offset = weekStart === 'monday' ? (d.getDay() + 6) % 7 : d.getDay();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset);
}

/** Start of the current window (local midnight / last weekStart boundary) as ms. */
export function windowStartMs(period: 'day' | 'week', nowMs: number, weekStart: WeekStart): number {
  const d = new Date(nowMs);
  if (period === 'day') return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return weekStartDate(nowMs, weekStart).getTime();
}

/**
 * Sum of matching sessions inside the promise's window.
 * Matching rule: a promise with `courseId === null` counts every session
 * (all subjects); a subject-specific promise counts only sessions tagged with
 * that course — anonymous (null/undefined course) sessions never credit it.
 */
export function promiseProgress(
  p: PromiseInput,
  sessions: PromiseSession[],
  nowMs: number,
  weekStart: WeekStart,
): { doneMin: number; targetMin: number; ratio: number } {
  const todayId = dateIdOf(nowMs);
  const weekId = dateIdOf(weekStartDate(nowMs, weekStart).getTime());
  let doneMin = 0;
  for (const s of sessions) {
    if (!(p.courseId === null || s.courseId === p.courseId)) continue;
    const sessionId = dateIdOf(s.startedAtMs);
    const inWindow = p.period === 'day' ? sessionId === todayId : sessionId >= weekId;
    if (inWindow) doneMin += s.durationMin;
  }
  const ratio = p.targetMin > 0 ? Math.min(1, doneMin / p.targetMin) : 0;
  return { doneMin, targetMin: p.targetMin, ratio };
}
