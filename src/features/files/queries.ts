import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { files, StoredFile } from '@/db/schema';
import { FileDraft } from './logic';

export async function listAllFiles(): Promise<StoredFile[]> {
  return db.select().from(files).orderBy(desc(files.addedAt));
}

export async function listFilesByCourse(courseId: string): Promise<StoredFile[]> {
  return db.select().from(files).where(eq(files.courseId, courseId)).orderBy(desc(files.addedAt));
}

export async function getFileById(id: string): Promise<StoredFile | null> {
  const [row] = await db.select().from(files).where(eq(files.id, id)).limit(1);
  return row ?? null;
}

export async function insertFile(draft: FileDraft): Promise<StoredFile> {
  const [row] = await db
    .insert(files)
    .values({
      courseId: draft.courseId,
      category: draft.category,
      name: draft.name,
      sandboxUri: draft.sandboxUri,
      size: draft.size,
      mime: draft.mime,
      description: draft.description ?? null,
    })
    .returning();
  if (!row) throw new Error('file insert returned no row');
  return row;
}

export async function deleteFileRow(id: string): Promise<void> {
  await db.delete(files).where(eq(files.id, id));
}
