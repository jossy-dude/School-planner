import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { Note, notes } from '@/db/schema';
import { NoteDraft, NotePatch } from './logic';

// Table has no createdAt — newest edit first comes from updatedAt desc.
export async function listNotesByCourse(courseId: string): Promise<Note[]> {
  return db
    .select()
    .from(notes)
    .where(eq(notes.courseId, courseId))
    .orderBy(desc(notes.updatedAt));
}

export async function getNoteById(id: string): Promise<Note | null> {
  const [row] = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
  return row ?? null;
}

export async function insertNote(draft: NoteDraft): Promise<Note> {
  const [row] = await db
    .insert(notes)
    .values({
      courseId: draft.courseId,
      kind: draft.kind,
      body: draft.body,
      description: draft.description ?? null,
    })
    .returning();
  if (!row) throw new Error('note insert returned no row');
  return row;
}

export async function updateNote(id: string, patch: NotePatch): Promise<Note> {
  await db
    .update(notes)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(notes.id, id));
  const [updated] = await db.select().from(notes).where(eq(notes.id, id));
  if (!updated) throw new Error('note update returned no row');
  return updated;
}

export async function deleteNote(id: string): Promise<void> {
  await db.delete(notes).where(eq(notes.id, id));
}
