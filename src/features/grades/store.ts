import { useMemo } from 'react';
import { create } from 'zustand';
import { Grade, GradeCategory } from '@/db/schema';
import { courseFinalPct } from '@/lib/gpa';
import { CategoryDraft, GradeDraft, GradePatch } from './logic';
import {
  insertCategory,
  insertGrade,
  listCategories,
  listGrades,
  patchGrade,
  removeCategory,
  removeGrade,
} from './queries';

interface GradesState {
  courseId: string | null;
  categories: GradeCategory[];
  grades: Grade[];
  loaded: boolean;
  refresh: (courseId: string) => Promise<void>;
  addGrade: (draft: GradeDraft) => Promise<Grade>;
  updateGrade: (id: string, patch: GradePatch, courseId: string) => Promise<void>;
  removeGrade: (id: string, courseId: string) => Promise<void>;
  addCategory: (draft: CategoryDraft) => Promise<GradeCategory>;
  removeCategory: (id: string, courseId: string) => Promise<void>;
}

export const useGradesStore = create<GradesState>((set, get) => ({
  courseId: null,
  categories: [],
  grades: [],
  loaded: false,
  refresh: async (courseId) => {
    const [categories, grades] = await Promise.all([listCategories(courseId), listGrades(courseId)]);
    set({ courseId, categories, grades, loaded: true });
    // Grades are not reminders, so no refreshReminders() here. finalPct is
    // never stored — useGrades re-derives it from this grades array.
  },
  addGrade: async (draft) => {
    const row = await insertGrade(draft);
    await get().refresh(draft.courseId);
    return row;
  },
  updateGrade: async (id, patch, courseId) => {
    await patchGrade(id, patch);
    await get().refresh(courseId);
  },
  removeGrade: async (id, courseId) => {
    await removeGrade(id);
    await get().refresh(courseId);
  },
  addCategory: async (draft) => {
    const row = await insertCategory(draft);
    await get().refresh(draft.courseId);
    return row;
  },
  removeCategory: async (id, courseId) => {
    await removeCategory(id);
    await get().refresh(courseId);
  },
}));

// Shared frozen empties: identity-stable so useMemo deps don't churn renders
// while another course's data (or nothing) is loaded.
const EMPTY_GRADES: Grade[] = [];
const EMPTY_CATEGORIES: GradeCategory[] = [];

export function useGrades(courseId: string) {
  const state = useGradesStore();
  const active = state.loaded && state.courseId === courseId;
  const grades = active ? state.grades : EMPTY_GRADES;
  const categories = active ? state.categories : EMPTY_CATEGORIES;
  const finalPct = useMemo(
    () =>
      courseFinalPct(
        grades.map((g) => ({ score: g.score, maxScore: g.maxScore, weightOverride: g.weightOverride })),
      ),
    [grades],
  );
  return {
    categories,
    grades,
    finalPct,
    loaded: active,
    refresh: state.refresh,
    addGrade: (draft: Omit<GradeDraft, 'courseId'>) => state.addGrade({ ...draft, courseId }),
    updateGrade: (id: string, patch: GradePatch) => state.updateGrade(id, patch, courseId),
    removeGrade: (id: string) => state.removeGrade(id, courseId),
    addCategory: (draft: Omit<CategoryDraft, 'courseId'>) => state.addCategory({ ...draft, courseId }),
    removeCategory: (id: string) => state.removeCategory(id, courseId),
  };
}
