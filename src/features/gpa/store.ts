import { useMemo } from 'react';
import { create } from 'zustand';
import { Course, GpaScale, Grade, Term } from '@/db/schema';
import { useCoursesStore } from '@/features/courses/store';
import { useSettings } from '@/features/settings/store';
import {
  CourseInput,
  GradeRow,
  Scale,
  computeGpa,
  courseFinalPct,
  sortScaleRows,
} from '@/lib/gpa';
import { activeScale } from './logic';
import { listAllGrades, listGpaScales, listTerms } from './queries';

export type GpaMode = 'term' | 'cumulative';

interface GpaState {
  // All grades in one array: the GPA screen aggregates every course at once and
  // the grades store only ever holds ONE course (useGrades(courseId)).
  grades: Grade[];
  terms: Term[];
  scales: GpaScale[];
  mode: GpaMode;
  selectedTermId: string | null;
  loaded: boolean;
  refresh: () => Promise<void>;
  setMode: (mode: GpaMode) => void;
  setSelectedTermId: (id: string | null) => void;
}

export const useGpaStore = create<GpaState>((set) => ({
  grades: [],
  terms: [],
  scales: [],
  mode: 'cumulative',
  selectedTermId: null,
  loaded: false,
  refresh: async () => {
    const [grades, terms, scales] = await Promise.all([
      listAllGrades(),
      listTerms(),
      listGpaScales(),
    ]);
    set({ grades, terms, scales, loaded: true });
  },
  setMode: (mode) => set({ mode }),
  setSelectedTermId: (selectedTermId) => set({ selectedTermId }),
}));

export interface GpaCourseRow {
  course: Course;
  finalPct: number | null;
  excluded: boolean;
}

export interface GpaResultBundle {
  rows: GpaCourseRow[];
  inputs: CourseInput[];
  scale: Scale;
  maxPoints: number;
  rounding: number;
  mode: GpaMode;
  selectedTermId: string | null;
  terms: Term[];
  scales: GpaScale[];
  gpa: number | null;
  totalCredits: number;
  includedCount: number;
  hasGrades: boolean;
  setMode: (mode: GpaMode) => void;
  setSelectedTermId: (id: string | null) => void;
}

// Settings are the single source of truth for exclusions / rounding / scale id
// (settings.gpa_excluded, gpa_rounding, gpa_scale_id) — the gpa store never
// mirrors them, so there is no second copy to fall out of sync.
export function useGpaResult(): GpaResultBundle {
  const courses = useCoursesStore((s) => s.courses);
  const grades = useGpaStore((s) => s.grades);
  const terms = useGpaStore((s) => s.terms);
  const scales = useGpaStore((s) => s.scales);
  const mode = useGpaStore((s) => s.mode);
  const selectedTermId = useGpaStore((s) => s.selectedTermId);
  const setMode = useGpaStore((s) => s.setMode);
  const setSelectedTermId = useGpaStore((s) => s.setSelectedTermId);
  const settings = useSettings();

  const finalByCourse = useMemo(() => {
    const grouped = new Map<string, GradeRow[]>();
    for (const grade of grades) {
      const list = grouped.get(grade.courseId);
      const row: GradeRow = {
        score: grade.score,
        maxScore: grade.maxScore,
        weightOverride: grade.weightOverride,
      };
      if (list) list.push(row);
      else grouped.set(grade.courseId, [row]);
    }
    const map = new Map<string, number | null>();
    grouped.forEach((list, courseId) => map.set(courseId, courseFinalPct(list)));
    return map;
  }, [grades]);

  return useMemo(() => {
    const excluded = new Set(settings.gpa_excluded);
    const inTerm =
      mode === 'term' && selectedTermId !== null
        ? courses.filter((c) => c.termId === selectedTermId)
        : courses;
    const rows: GpaCourseRow[] = inTerm.map((course) => ({
      course,
      finalPct: finalByCourse.get(course.id) ?? null,
      excluded: excluded.has(course.id),
    }));
    const inputs: CourseInput[] = rows.map((r) => ({
      id: r.course.id,
      credits: r.course.credits,
      finalPct: r.finalPct,
      excluded: r.excluded,
    }));
    const scale = activeScale(scales, settings.gpa_scale_id);
    const rounding = settings.gpa_rounding;
    const { gpa, totalCredits, includedCount } = computeGpa(inputs, scale, rounding);
    const top = sortScaleRows(scale.rows)[0];
    return {
      rows,
      inputs,
      scale,
      maxPoints: top ? top.points : 4,
      rounding,
      mode,
      selectedTermId,
      terms,
      scales,
      gpa,
      totalCredits,
      includedCount,
      hasGrades: grades.length > 0,
      setMode,
      setSelectedTermId,
    };
  }, [courses, finalByCourse, mode, selectedTermId, scales, settings, setMode, setSelectedTermId, terms, grades.length]);
}
