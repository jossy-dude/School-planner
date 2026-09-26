import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { GpaScale, Grade, Term, gpaScales, grades, terms } from '@/db/schema';
import { ScaleRow } from '@/lib/gpa';

// One query for EVERY grade — the GPA screen needs all courses at once, and
// useGrades() is per-course (one course in the grades store at a time).
export async function listAllGrades(): Promise<Grade[]> {
  return db.select().from(grades).orderBy(asc(grades.date));
}

export async function listTerms(): Promise<Term[]> {
  return db.select().from(terms).orderBy(asc(terms.startDate));
}

export async function listGpaScales(): Promise<GpaScale[]> {
  return db.select().from(gpaScales).orderBy(asc(gpaScales.name));
}

export interface GpaScaleDraft {
  id?: string;
  name: string;
  rows: ScaleRow[];
  isDefault: boolean;
}

export async function upsertGpaScale(draft: GpaScaleDraft): Promise<GpaScale> {
  if (draft.id !== undefined) {
    await db
      .update(gpaScales)
      .set({ name: draft.name, rows: draft.rows, isDefault: draft.isDefault, updatedAt: new Date() })
      .where(eq(gpaScales.id, draft.id));
    const [row] = await db.select().from(gpaScales).where(eq(gpaScales.id, draft.id)).limit(1);
    if (!row) throw new Error('gpa scale update returned no row');
    return row;
  }
  const [row] = await db
    .insert(gpaScales)
    .values({ name: draft.name, rows: draft.rows, isDefault: draft.isDefault })
    .returning();
  if (!row) throw new Error('gpa scale insert returned no row');
  return row;
}
