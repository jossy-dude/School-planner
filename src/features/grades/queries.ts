import { asc, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { Grade, GradeCategory, gradeCategories, grades } from '@/db/schema';
import { CategoryDraft, GradeDraft, GradePatch } from './logic';

export async function listCategories(courseId: string): Promise<GradeCategory[]> {
  return db
    .select()
    .from(gradeCategories)
    .where(eq(gradeCategories.courseId, courseId))
    .orderBy(asc(gradeCategories.name));
}

export async function listGrades(courseId: string): Promise<Grade[]> {
  return db
    .select()
    .from(grades)
    .where(eq(grades.courseId, courseId))
    .orderBy(desc(grades.date));
}

export async function getGradeById(id: string): Promise<Grade | null> {
  const [row] = await db.select().from(grades).where(eq(grades.id, id)).limit(1);
  return row ?? null;
}

export async function insertGrade(draft: GradeDraft): Promise<Grade> {
  const [row] = await db
    .insert(grades)
    .values({
      courseId: draft.courseId,
      categoryId: draft.categoryId ?? null,
      title: draft.title,
      score: draft.score,
      maxScore: draft.maxScore,
      weightOverride: draft.weightOverride ?? null,
      date: draft.date,
      note: draft.note ?? null,
    })
    .returning();
  if (!row) throw new Error('grade insert returned no row');
  return row;
}

export async function patchGrade(id: string, patch: GradePatch): Promise<Grade> {
  await db
    .update(grades)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(grades.id, id));
  const [updated] = await db.select().from(grades).where(eq(grades.id, id));
  if (!updated) throw new Error('grade update returned no row');
  return updated;
}

export async function removeGrade(id: string): Promise<void> {
  await db.delete(grades).where(eq(grades.id, id));
}

export async function insertCategory(draft: CategoryDraft): Promise<GradeCategory> {
  const [row] = await db
    .insert(gradeCategories)
    .values({ courseId: draft.courseId, name: draft.name, weight: draft.weight })
    .returning();
  if (!row) throw new Error('category insert returned no row');
  return row;
}

// FK is onDelete: 'set null' — grades keep their scores, they just lose the tag.
export async function removeCategory(id: string): Promise<void> {
  await db.delete(gradeCategories).where(eq(gradeCategories.id, id));
}
