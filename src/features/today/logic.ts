import type { Occurrence } from '@/lib/schedule';
import { PromiseSession, promiseProgress, WeekStart } from '@/lib/promises/logic';

export type AgendaState = 'past' | 'now' | 'upcoming';

export function agendaState(occ: Pick<Occurrence, 'startMs' | 'endMs'>, nowMs: number): AgendaState {
  if (nowMs >= occ.endMs) return 'past';
  if (nowMs >= occ.startMs) return 'now';
  return 'upcoming';
}

// Total study minutes logged today across every subject, against the daily goal
// from Settings. Reuses the promise math with a synthetic "everything, today"
// promise rather than re-implementing the same day-window filter.
export function studyToday(
  sessions: PromiseSession[],
  goalMin: number,
  nowMs: number,
  weekStart: WeekStart,
): { doneMin: number; goalMin: number; ratio: number } {
  const goal = Math.max(0, goalMin);
  const { doneMin } = promiseProgress(
    { id: '__today__', courseId: null, subject: '', targetMin: goal, period: 'day' },
    sessions, nowMs, weekStart,
  );
  return { doneMin, goalMin: goal, ratio: goal === 0 ? 0 : Math.min(1, doneMin / goal) };
}
