import { create } from 'zustand';
import { Pattern, ScheduleException } from '@/db/schema';
import { refreshReminders } from '@/features/reminders/refresh';
import { ExceptionDraft, PatternDraft } from './logic';
import {
  listExceptions,
  listPatterns,
  removeException as deleteExceptionRow,
  removePattern as deletePatternRow,
  upsertException,
  upsertPattern,
} from './queries';

interface ScheduleState {
  patterns: Pattern[];
  exceptions: ScheduleException[];
  loaded: boolean;
  refresh: () => Promise<void>;
  savePattern: (patch: PatternDraft) => Promise<Pattern>;
  removePattern: (id: string) => Promise<void>;
  saveException: (patch: ExceptionDraft) => Promise<ScheduleException>;
  removeException: (id: string) => Promise<void>;
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  patterns: [],
  exceptions: [],
  loaded: false,
  refresh: async () => {
    const [patterns, exceptions] = await Promise.all([listPatterns(), listExceptions()]);
    set({ patterns, exceptions, loaded: true });
    // Every mutation funnels through refresh, so this one hook covers all of them.
    void refreshReminders().catch(() => {});
  },
  savePattern: async (patch) => {
    const row = await upsertPattern(patch);
    await get().refresh();
    return row;
  },
  removePattern: async (id) => {
    await deletePatternRow(id);
    await get().refresh();
  },
  saveException: async (patch) => {
    const row = await upsertException(patch);
    await get().refresh();
    return row;
  },
  removeException: async (id) => {
    await deleteExceptionRow(id);
    await get().refresh();
  },
}));

export function useSchedule(courseId?: string) {
  const state = useScheduleStore();
  if (!courseId) return state;
  return {
    ...state,
    patterns: state.patterns.filter((p) => p.courseId === courseId),
    exceptions: state.exceptions.filter((e) => e.courseId === courseId),
  };
}
