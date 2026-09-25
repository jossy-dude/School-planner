import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { courses, Course } from '@/db/schema';
import { CourseDraft } from './logic';

export async function listCourses(): Promise<Course[]> {
  return db.select().from(courses).orderBy(courses.name);
}

export async function getCourse(id: string): Promise<Course | undefined> {
  const [row] = await db.select().from(courses).where(eq(courses.id, id));
  return row;
}

export async function insertCourse(draft: CourseDraft): Promise<Course> {
  const [row] = await db.insert(courses).values(draft).returning();
  if (!row) throw new Error('course insert returned no row');
  return row;
}

export async function patchCourse(id: string, patch: Partial<CourseDraft>): Promise<void> {
  await db.update(courses).set({ ...patch, updatedAt: new Date() }).where(eq(courses.id, id));
}

export async function removeCourse(id: string): Promise<void> {
  await db.delete(courses).where(eq(courses.id, id));
}
