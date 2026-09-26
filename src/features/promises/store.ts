import { create } from 'zustand';
import { StudyPromise } from '@/db/schema';
import { PromiseSession, WeekStart, windowStartMs } from '@/lib/promises/logic';
import { insertPromise, listPromises, listSessionsSince, PromiseDraft, removePromise } from './queries';

interface PromisesState {
  promises: StudyPromise[];
  sessions: PromiseSession[];
  weekStart: WeekStart;
  loaded: boolean;
  refresh: (weekStart: WeekStart) => Promise<void>;
  add: (draft: PromiseDraft) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const usePromisesStore = create<PromisesState>((set, get) => ({
  promises: [],
  sessions: [],
  weekStart: 'monday',
  loaded: false,
  refresh: async (weekStart) => {
    // Week start covers both windows: every day promise's window is inside it.
    const sinceMs = windowStartMs('week', Date.now(), weekStart);
    const [promises, rows] = await Promise.all([listPromises(), listSessionsSince(sinceMs)]);
    set({
      promises,
      sessions: rows.map((r) => ({
        startedAtMs: r.startedAt.getTime(),
        durationMin: r.durationMin,
        courseId: r.courseId,
      })),
      weekStart,
      loaded: true,
    });
  },
  add: async (draft) => {
    await insertPromise(draft);
    await get().refresh(get().weekStart);
  },
  remove: async (id) => {
    await removePromise(id);
    await get().refresh(get().weekStart);
  },
}));
