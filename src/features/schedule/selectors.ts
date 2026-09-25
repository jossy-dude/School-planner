import { ExceptionInput, Occurrence, PatternInput, occurrencesInRange } from '@/lib/schedule';

export interface ScheduleSlice { patterns: PatternInput[]; exceptions: ExceptionInput[]; }

export function todayOccurrences(slice: ScheduleSlice, nowMs: number): Occurrence[] {
  const d = new Date(nowMs);
  const start = new Date(d); start.setHours(0, 0, 0, 0);
  const end = new Date(d); end.setHours(23, 59, 59, 999);
  return occurrencesInRange(slice.patterns, slice.exceptions, start.getTime(), end.getTime());
}

export function weekOccurrences(slice: ScheduleSlice, nowMs: number, weekStart: 'sunday' | 'monday'): Occurrence[] {
  const d = new Date(nowMs); d.setHours(0, 0, 0, 0);
  const offset = weekStart === 'monday' ? (d.getDay() + 6) % 7 : d.getDay();
  const start = new Date(d); start.setDate(d.getDate() - offset);
  const end = new Date(start); end.setDate(start.getDate() + 7);
  // last millisecond of the week (exclusive-style end against the engine's inclusive filter)
  return occurrencesInRange(slice.patterns, slice.exceptions, start.getTime(), end.getTime() - 1);
}

export function nextActiveOccurrence(slice: ScheduleSlice, nowMs: number):
  { current: Occurrence | null; next: Occurrence | null } {
  const day = todayOccurrences(slice, nowMs);
  // cross-midnight: a session that STARTED yesterday may still be running past midnight
  const yesterday = new Date(nowMs); yesterday.setDate(yesterday.getDate() - 1);
  const stillRunning = occurrencesInRange(slice.patterns, slice.exceptions, yesterday.getTime(), nowMs)
    .filter((o) => o.endMs > nowMs && o.startMs < nowMs);
  const current = [...stillRunning, ...day].find((o) => nowMs >= o.startMs && nowMs < o.endMs) ?? null;
  if (current) return { current, next: null };
  const upcoming = [...day, ...occurrencesInRange(slice.patterns, slice.exceptions, nowMs, nowMs + 7 * 86_400_000)]
    .filter((o) => o.startMs > nowMs)
    .sort((a, b) => a.startMs - b.startMs);
  return { current: null, next: upcoming[0] ?? null };
}
