export interface GradeDraft {
  courseId: string;
  categoryId?: string | null;
  title: string;
  score: number;
  maxScore: number;
  weightOverride?: number | null;
  date: string; // YYYY-MM-DD
  note?: string | null;
}

export type GradePatch = Partial<Omit<GradeDraft, 'courseId'>>;

export interface CategoryDraft {
  courseId: string;
  name: string;
  // Stored as a percentage point value (0–100): chips show `HW 40%` and the
  // course section stamps WEIGHTS ≠100 when the sum leaves 100.
  weight: number;
}

export function validateGrade(input: {
  title?: string;
  score?: number;
  maxScore?: number;
}): { ok: boolean; error?: string } {
  if (!input.title || input.title.trim().length === 0) {
    return { ok: false, error: 'Title is required' };
  }
  if (typeof input.maxScore !== 'number' || !Number.isFinite(input.maxScore) || input.maxScore <= 0) {
    return { ok: false, error: 'Max score must be greater than 0' };
  }
  if (typeof input.score !== 'number' || !Number.isFinite(input.score)) {
    return { ok: false, error: 'Score is required' };
  }
  if (input.score < 0) {
    return { ok: false, error: 'Score cannot be negative' };
  }
  if (input.score > input.maxScore) {
    return { ok: false, error: 'Score cannot exceed max score' };
  }
  return { ok: true };
}
