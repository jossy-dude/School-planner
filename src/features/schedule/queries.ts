import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { schedulePatterns, scheduleExceptions, Pattern, ScheduleException } from '@/db/schema';
import { ExceptionDraft, PatternDraft } from './logic';

export async function listPatterns(courseId?: string): Promise<Pattern[]> {
  if (courseId) {
    return db
      .select()
      .from(schedulePatterns)
      .where(eq(schedulePatterns.courseId, courseId))
      .orderBy(schedulePatterns.weekday, schedulePatterns.startTime);
  }
  return db.select().from(schedulePatterns).orderBy(schedulePatterns.weekday, schedulePatterns.startTime);
}

export async function listExceptions(courseId?: string): Promise<ScheduleException[]> {
  if (courseId) {
    return db
      .select()
      .from(scheduleExceptions)
      .where(eq(scheduleExceptions.courseId, courseId))
      .orderBy(scheduleExceptions.date);
  }
  return db.select().from(scheduleExceptions).orderBy(scheduleExceptions.date);
}

export async function upsertPattern(row: PatternDraft): Promise<Pattern> {
  if (row.id) {
    const { id, ...patch } = row;
    await db.update(schedulePatterns).set({ ...patch, updatedAt: new Date() }).where(eq(schedulePatterns.id, id));
    const [updated] = await db.select().from(schedulePatterns).where(eq(schedulePatterns.id, id));
    if (!updated) throw new Error('pattern update returned no row');
    return updated;
  }
  const [inserted] = await db
    .insert(schedulePatterns)
    .values({
      courseId: row.courseId,
      weekday: row.weekday,
      startTime: row.startTime,
      endTime: row.endTime,
      location: row.location ?? null,
      validFrom: row.validFrom ?? null,
      validTo: row.validTo ?? null,
    })
    .returning();
  if (!inserted) throw new Error('pattern insert returned no row');
  return inserted;
}

export async function removePattern(id: string): Promise<void> {
  await db.delete(schedulePatterns).where(eq(schedulePatterns.id, id));
}

export async function upsertException(row: ExceptionDraft): Promise<ScheduleException> {
  if (row.id) {
    const { id, ...patch } = row;
    await db.update(scheduleExceptions).set({ ...patch, updatedAt: new Date() }).where(eq(scheduleExceptions.id, id));
    const [updated] = await db.select().from(scheduleExceptions).where(eq(scheduleExceptions.id, id));
    if (!updated) throw new Error('exception update returned no row');
    return updated;
  }
  const [inserted] = await db
    .insert(scheduleExceptions)
    .values({
      courseId: row.courseId,
      patternId: row.patternId ?? null,
      date: row.date,
      kind: row.kind,
      startTime: row.startTime ?? null,
      endTime: row.endTime ?? null,
    })
    .returning();
  if (!inserted) throw new Error('exception insert returned no row');
  return inserted;
}

export async function removeException(id: string): Promise<void> {
  await db.delete(scheduleExceptions).where(eq(scheduleExceptions.id, id));
}
