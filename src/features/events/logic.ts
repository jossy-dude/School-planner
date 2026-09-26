import { isValidDateId, isValidTime } from '@/features/schedule/logic';
import { parseDateId, toDateId } from '@/lib/schedule';

export type EventKind = 'assignment' | 'test' | 'quiz' | 'club' | 'meeting' | 'other';

export const KIND_GLYPHS: Record<EventKind, string> = {
  assignment: '📋',
  test: '📝',
  quiz: '❓',
  club: '⚑',
  meeting: '◎',
  other: '•',
};

export const EVENT_KINDS: readonly EventKind[] = ['assignment', 'test', 'quiz', 'club', 'meeting', 'other'];

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const MIN_MS = 60_000;

export interface EventDraft {
  kind: EventKind;
  title: string;
  description?: string;
  courseId?: string | null;
  dueAtMs: number;
  remindLeadOverrideMin?: number | null;
}

export type EventPatch = Partial<EventDraft>;

// Magnitude bands cover every positive remainder; OVERDUE wins for x <= 0.
// (The plan's "same calendar day → TODAY" clause was dropped in c4c589c — it
// conflicted with the pinned tests, which win.)
export function tMinusLabel(dueAtMs: number, nowMs: number): string {
  const x = dueAtMs - nowMs;
  if (!Number.isFinite(x) || x <= 0) return 'OVERDUE';
  if (x > DAY_MS) return `T-${Math.ceil(x / DAY_MS)}D`;
  if (x > HOUR_MS) return `T-${Math.ceil(x / HOUR_MS)}H`;
  return `T-${Math.ceil(x / MIN_MS)}M`;
}

export function validateEvent(input: {
  title?: string;
  dueAtMs?: number;
  kind?: EventKind;
}): { ok: boolean; error?: string } {
  if (!input.title || input.title.trim().length === 0) {
    return { ok: false, error: 'Title is required' };
  }
  if (typeof input.dueAtMs !== 'number' || !Number.isFinite(input.dueAtMs)) {
    return { ok: false, error: 'Due date is required' };
  }
  if (input.kind !== undefined && !EVENT_KINDS.includes(input.kind)) {
    return { ok: false, error: 'Unknown event kind' };
  }
  return { ok: true };
}

export function composeDueAtMs(dateId: string, hhmm: string): number {
  if (!isValidDateId(dateId) || !isValidTime(hhmm)) return Number.NaN;
  const d = parseDateId(dateId);
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m).getTime();
}

export function dueAtToParts(ms: number): { dateId: string; time: string } {
  if (!Number.isFinite(ms)) return { dateId: '', time: '' };
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return { dateId: toDateId(d), time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
}
