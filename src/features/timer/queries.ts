import { desc } from 'drizzle-orm';
import { db } from '@/db';
import { studySessions, StudySession } from '@/db/schema';

export async function insertSession(
  courseId: string | null,
  startedAt: Date,
  durationMin: number,
): Promise<StudySession> {
  const [row] = await db
    .insert(studySessions)
    .values({ courseId, startedAt, durationMin })
    .returning();
  if (!row) throw new Error('insertSession returned no row');
  return row;
}

export async function listSessions(limit = 10): Promise<StudySession[]> {
  return db
    .select()
    .from(studySessions)
    .orderBy(desc(studySessions.startedAt))
    .limit(limit);
}
