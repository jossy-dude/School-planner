import { and, asc, eq, gte, lte, lt } from 'drizzle-orm';
import { db } from '@/db';
import { attendance, events, Attendance, SchoolEvent } from '@/db/schema';

export async function listEventsInRange(startMs: number, endMs: number): Promise<SchoolEvent[]> {
  return db
    .select()
    .from(events)
    .where(and(gte(events.dueAt, new Date(startMs)), lt(events.dueAt, new Date(endMs))))
    .orderBy(asc(events.dueAt));
}

export async function listAbsencesInRange(startId: string, endId: string): Promise<Attendance[]> {
  return db
    .select()
    .from(attendance)
    .where(and(
      eq(attendance.status, 'absent'),
      gte(attendance.date, startId),
      lte(attendance.date, endId),
    ))
    .orderBy(attendance.date);
}
