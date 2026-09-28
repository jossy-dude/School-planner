import type { Occurrence } from '@/lib/schedule';

export interface PlannedReminder {
  key: string;
  title: string;
  body: string;
  fireAtMs: number;
}

export interface PlanRemindersInput {
  occurrences: Occurrence[];
  events: {
    id: string;
    title: string;
    dueAtMs: number;
    done: boolean;
    leadMin: number | null;
    courseName?: string;
  }[];
  nowMs: number;
  defaultLeadMin: number;
  horizonDays?: number;
  leadByCourse: Record<string, number | null>;
  coursesById?: Record<string, { name: string; emoji?: string | null }>;
}

const DAY_MS = 86_400_000;
const MAX_REMINDERS = 64;

function hhmm(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function planReminders(input: PlanRemindersInput): PlannedReminder[] {
  const { occurrences, events, nowMs, defaultLeadMin, horizonDays = 14, leadByCourse, coursesById } = input;
  const horizonEndMs = nowMs + horizonDays * DAY_MS;
  const seen = new Set<string>();
  const out: PlannedReminder[] = [];

  for (const occ of occurrences) {
    if (occ.startMs > horizonEndMs) continue;
    const fireAtMs = occ.startMs - (leadByCourse[occ.courseId] ?? defaultLeadMin) * 60_000;
    if (fireAtMs <= nowMs) continue;
    const key = `class:${occ.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const course = coursesById?.[occ.courseId];
    const label = course ? [course.emoji, course.name].filter(Boolean).join(' ') : 'CLASS';
    out.push({
      key,
      title: `${label} starts ${hhmm(occ.startMs)}`,
      body: `Starts at ${hhmm(occ.startMs)}`,
      fireAtMs,
    });
  }

  for (const ev of events) {
    if (ev.done) continue;
    const fireAtMs = ev.dueAtMs - (ev.leadMin ?? defaultLeadMin) * 60_000;
    if (fireAtMs <= nowMs) continue;
    const key = `event:${ev.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      key,
      title: `${ev.title} due ${hhmm(ev.dueAtMs)}`,
      body: `Due at ${hhmm(ev.dueAtMs)}${ev.courseName ? ` · ${ev.courseName}` : ''}`,
      fireAtMs,
    });
  }

  return out.sort((a, b) => a.fireAtMs - b.fireAtMs).slice(0, MAX_REMINDERS);
}
