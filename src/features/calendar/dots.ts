import type { SchoolEvent } from '@/db/schema';
import type { Occurrence } from '@/lib/schedule';
import { colors } from '@/ui/tokens';

export type CalendarFilter = 'CLASSES' | 'EXAMS' | 'TASKS' | 'CLUBS';

export interface DotEvent {
  id: string;
  kind: SchoolEvent['kind'];
  done: boolean;
  dueAtMs: number;
  title?: string;
  courseId?: string | null;
}

export interface DotInfo {
  classCount: number;
  hasAbsence: boolean;
  hasExam: boolean;
  hasTask: boolean;
  hasClub: boolean;
}

export interface DayDotSpec {
  color: string;
  shape: 'circle' | 'diamond';
}

const EXAM_KINDS: ReadonlySet<SchoolEvent['kind']> = new Set(['test', 'quiz']);

// Events and absences are expected to already be scoped to the day by the caller
// (dayDotInfo does not re-derive a date from dueAtMs). Exams/clubs count regardless
// of `done`; only tasks require `!done`.
export function dayDotInfo(
  dateId: string,
  occ: Occurrence[],
  events: DotEvent[],
  absences: { date: string }[],
): DotInfo {
  return {
    classCount: occ.filter((o) => o.dateId === dateId).length,
    hasAbsence: absences.some((a) => a.date === dateId),
    hasExam: events.some((e) => EXAM_KINDS.has(e.kind)),
    hasTask: events.some((e) => e.kind === 'assignment' && !e.done),
    hasClub: events.some((e) => e.kind === 'club'),
  };
}

const MAX_CLASS_DOTS = 3;
const CLASS_DOT: DayDotSpec = { color: colors.ink, shape: 'circle' };
const EXAM_DOT: DayDotSpec = { color: colors.danger, shape: 'diamond' };
const TASK_DOT: DayDotSpec = { color: colors.ink70, shape: 'circle' };
const CLUB_DOT: DayDotSpec = { color: colors.ink40, shape: 'circle' };
const ABSENCE_DOT: DayDotSpec = { color: colors.danger, shape: 'circle' };

export function dayDots(info: DotInfo, filters: readonly CalendarFilter[]): DayDotSpec[] {
  const all = filters.length === 0;
  const on = (f: CalendarFilter) => all || filters.includes(f);
  const out: DayDotSpec[] = [];
  if (on('CLASSES')) {
    for (let i = 0; i < Math.min(info.classCount, MAX_CLASS_DOTS); i += 1) out.push(CLASS_DOT);
  }
  if (on('EXAMS') && info.hasExam) out.push(EXAM_DOT);
  if (on('TASKS') && info.hasTask) out.push(TASK_DOT);
  if (on('CLUBS') && info.hasClub) out.push(CLUB_DOT);
  // Absences have no filter chip, so their dot always shows.
  if (info.hasAbsence) out.push(ABSENCE_DOT);
  return out;
}

