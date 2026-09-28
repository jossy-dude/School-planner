import { desc, eq, gte } from 'drizzle-orm';
import { db } from '@/db';
import { studyPromises, studySessions, StudyPromise, StudySession } from '@/db/schema';

export interface PromiseDraft {
  courseId: string | null;
  subject: string;
  targetMin: number;
  period: 'day' | 'week';
}

// Table has no createdAt — newest first by updatedAt (disclosed in the report).
export async function listPromises(): Promise<StudyPromise[]> {
  return db.select().from(studyPromises).orderBy(desc(studyPromises.updatedAt));
}

export async function insertPromise(draft: PromiseDraft): Promise<StudyPromise> {
  const [row] = await db
    .insert(studyPromises)
    .values({
      courseId: draft.courseId,
      subject: draft.subject,
      targetMin: draft.targetMin,
      period: draft.period,
    })
    .returning();
  if (!row) throw new Error('insertPromise returned no row');
  return row;
}

export async function removePromise(id: string): Promise<void> {
  await db.delete(studyPromises).where(eq(studyPromises.id, id));
}

// One read feeds every promise window: the week window start is the earliest
// boundary a promise can need (a day window always sits inside the current week).
export async function listSessionsSince(sinceMs: number): Promise<StudySession[]> {
  return db
    .select()
    .from(studySessions)
    .where(gte(studySessions.startedAt, new Date(sinceMs)))
    .orderBy(desc(studySessions.startedAt));
}
