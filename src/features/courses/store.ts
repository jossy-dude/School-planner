import { create } from 'zustand';
import { Course } from '@/db/schema';
import { listCourses, insertCourse, patchCourse, removeCourse } from './queries';
import { CourseDraft } from './logic';

interface CoursesState {
  courses: Course[];
  loaded: boolean;
  refresh: () => Promise<void>;
  create: (draft: CourseDraft) => Promise<Course>;
  update: (id: string, patch: Partial<CourseDraft>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useCoursesStore = create<CoursesState>((set, get) => ({
  courses: [],
  loaded: false,
  refresh: async () => set({ courses: await listCourses(), loaded: true }),
  create: async (draft) => {
    const row = await insertCourse(draft);
    await get().refresh();
    return row;
  },
  update: async (id, patch) => {
    await patchCourse(id, patch);
    await get().refresh();
  },
  remove: async (id) => {
    await removeCourse(id);
    await get().refresh();
  },
}));

export const useCourses = () => useCoursesStore((s) => s.courses);