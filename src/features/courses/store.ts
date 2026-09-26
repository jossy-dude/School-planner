import { create } from 'zustand';
import { Course } from '@/db/schema';
import { refreshReminders } from '@/features/reminders/refresh';
import { useScheduleStore } from '@/features/schedule/store';
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
  refresh: async () => {
    set({ courses: await listCourses(), loaded: true });
    // Every mutation funnels through refresh, and course rows feed reminder
    // planning (per-course lead overrides) — so any change reschedules here.
    void refreshReminders().catch(() => {});
  },
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
    // The DB cascades this course's patterns/exceptions, but no global store
    // watches those tables — resync the schedule store at the delete moment
    // instead of waiting for the next screen mount (it reschedules reminders too).
    useScheduleStore.getState().refresh().catch(() => {});
  },
}));

export const useCourses = () => useCoursesStore((s) => s.courses);