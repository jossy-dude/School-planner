import { and, asc, eq, gte, lte } from 'drizzle-orm';
import { db } from '@/db';
import { events, SchoolEvent } from '@/db/schema';
import { EventDraft, EventPatch } from './logic';

export async function listEventsInRange(startMs: number, endMs: number): Promise<SchoolEvent[]> {
  return db
    .select()
    .from(events)
    .where(and(gte(events.dueAt, new Date(startMs)), lte(events.dueAt, new Date(endMs))))
    .orderBy(asc(events.dueAt));
}

export async function insertEvent(draft: EventDraft): Promise<SchoolEvent> {
  const [row] = await db
    .insert(events)
    .values({
      kind: draft.kind,
      title: draft.title,
      description: draft.description ?? '',
      courseId: draft.courseId ?? null,
      dueAt: new Date(draft.dueAtMs),
      remindLeadOverrideMin: draft.remindLeadOverrideMin ?? null,
    })
    .returning();
  if (!row) throw new Error('event insert returned no row');
  return row;
}

export async function patchEvent(id: string, patch: EventPatch): Promise<SchoolEvent> {
  const { dueAtMs, ...rest } = patch;
  await db
    .update(events)
    .set({
      ...rest,
      ...(dueAtMs !== undefined ? { dueAt: new Date(dueAtMs) } : {}),
      updatedAt: new Date(),
    })
    .where(eq(events.id, id));
  const [updated] = await db.select().from(events).where(eq(events.id, id));
  if (!updated) throw new Error('event update returned no row');
  return updated;
}

export async function removeEvent(id: string): Promise<void> {
  await db.delete(events).where(eq(events.id, id));
}

export async function toggleDone(id: string, done: boolean): Promise<SchoolEvent> {
  await db.update(events).set({ done, updatedAt: new Date() }).where(eq(events.id, id));
  const [updated] = await db.select().from(events).where(eq(events.id, id));
  if (!updated) throw new Error('event toggle returned no row');
  return updated;
}
