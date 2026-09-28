import type { Course } from '@/db/schema';
import type { DotEvent } from '@/features/calendar/dots';
import { KIND_GLYPHS } from '@/features/events/logic';
import type { Occurrence } from '@/lib/schedule';

export interface DayRow {
  key: string;
  emoji: string;
  title: string;
  courseId?: string | null;
  startMs?: number;
  /** Present on event rows — these are the draggable ones. */
  eventId?: string;
  dueAtMs?: number;
  done?: boolean;
}

export interface DaySection {
  key: 'CLASSES' | 'EXAMS' | 'TASKS' | 'CLUBS' | 'ABSENT';
  label: string;
  rows: DayRow[];
}

// Groups one day's classes, events and absences into labelled sections for the
// full-page day view. Empty sections are dropped so the page never shows a bare header.
export function buildDaySections(input: {
  occurrences: Occurrence[];
  events: DotEvent[];
  absences: { id: string; courseId: string | null }[];
  courses: Course[];
}): DaySection[] {
  const { occurrences, events, absences, courses } = input;
  const course = (id?: string | null) => (id ? courses.find((c) => c.id === id) : undefined);
  const eventRows = (pick: (e: DotEvent) => boolean, fallback: string): DayRow[] =>
    events
      .filter(pick)
      .sort((a, b) => a.dueAtMs - b.dueAtMs)
      .map((e) => ({
        key: e.id, emoji: KIND_GLYPHS[e.kind], title: e.title ?? fallback, courseId: e.courseId,
        eventId: e.id, dueAtMs: e.dueAtMs, done: e.done,
      }));

  const sections: DaySection[] = [
    {
      key: 'CLASSES', label: 'CLASSES',
      rows: [...occurrences].sort((a, b) => a.startMs - b.startMs).map((o) => {
        const c = course(o.courseId);
        return { key: o.id, emoji: c?.emoji ?? '📘', title: c?.name ?? 'CLASS', courseId: o.courseId, startMs: o.startMs };
      }),
    },
    { key: 'EXAMS', label: 'EXAMS', rows: eventRows((e) => e.kind === 'test' || e.kind === 'quiz', 'EXAM') },
    { key: 'TASKS', label: 'TASKS', rows: eventRows((e) => e.kind === 'assignment' && !e.done, 'TASK') },
    { key: 'CLUBS', label: 'CLUBS', rows: eventRows((e) => e.kind === 'club', 'CLUB') },
    {
      key: 'ABSENT', label: 'ABSENT',
      rows: absences.map((a) => {
        const c = course(a.courseId);
        return { key: `abs:${a.id}`, emoji: c?.emoji ?? '📘', title: c?.name ?? 'CLASS', courseId: a.courseId };
      }),
    },
  ];
  return sections.filter((s) => s.rows.length > 0);
}
