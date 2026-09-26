import { and, asc, gte, lt } from 'drizzle-orm';
import { db } from '@/db';
import { events, SchoolEvent } from '@/db/schema';

export async function listEventsInRange(startMs: number, endMs: number): Promise<SchoolEvent[]> {
  return db
    .select()
    .from(events)
    .where(and(gte(events.dueAt, new Date(startMs)), lt(events.dueAt, new Date(endMs))))
    .orderBy(asc(events.dueAt));
}
