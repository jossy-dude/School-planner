import { useCallback } from 'react';
import { create } from 'zustand';
import { Note } from '@/db/schema';
import { NoteDraft, NotePatch } from './logic';
import { deleteNote, insertNote, listNotesByCourse, updateNote } from './queries';

interface NotesState {
  courseId: string | null;
  notes: Note[];
  loaded: boolean;
  // Additive multi-course cache: the Vault screen can have several subject
  // folders expanded at once, each needing its own notes list resident at the
  // same time — unlike `courseId`/`notes` above (one active course, used by
  // the course-detail NotesPanel), this never evicts an entry when another
  // course loads.
  byCourse: Record<string, Note[]>;
  refresh: (courseId: string) => Promise<void>;
  refreshCourse: (courseId: string) => Promise<void>;
  create: (draft: NoteDraft) => Promise<Note>;
  update: (id: string, patch: NotePatch, courseId: string) => Promise<void>;
  remove: (id: string, courseId: string) => Promise<void>;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  courseId: null,
  notes: [],
  loaded: false,
  byCourse: {},
  refresh: async (courseId) => {
    try {
      const rows = await listNotesByCourse(courseId);
      set({ courseId, notes: rows, loaded: true });
    } catch {
      set({ courseId, loaded: true });
    }
  },
  refreshCourse: async (courseId) => {
    try {
      const rows = await listNotesByCourse(courseId);
      set((s) => ({ byCourse: { ...s.byCourse, [courseId]: rows } }));
    } catch {
      set((s) => ({ byCourse: { ...s.byCourse, [courseId]: s.byCourse[courseId] ?? [] } }));
    }
  },
  create: async (draft) => {
    const row = await insertNote(draft);
    await get().refresh(draft.courseId);
    return row;
  },
  update: async (id, patch, courseId) => {
    await updateNote(id, patch);
    await get().refresh(courseId);
  },
  remove: async (id, courseId) => {
    await deleteNote(id);
    await get().refresh(courseId);
  },
}));

// Shared frozen empty: identity-stable so renders don't churn while another
// course's notes (or nothing) are loaded.
const EMPTY_NOTES: Note[] = [];

// Multi-course read cache for the Vault, where several subject folders can be
// open (and fetched) at the same time. Writes still go through `/note-edit`
// (bound to a single course via `useNotes`); folders re-pull with `refresh`
// on focus/expand, matching this app's usual refetch-on-focus pattern.
export function useCourseNotesCache(courseId: string) {
  const rows = useNotesStore((s) => s.byCourse[courseId]);
  const refreshCourse = useNotesStore((s) => s.refreshCourse);
  // useCallback: SubjectFolder refetches from an effect keyed on `refresh`, so a
  // fresh closure per render would refetch (and re-render) forever.
  const refresh = useCallback(() => refreshCourse(courseId), [refreshCourse, courseId]);
  return {
    notes: rows ?? EMPTY_NOTES,
    loaded: rows !== undefined,
    refresh,
  };
}

export function useNotes(courseId: string) {
  const state = useNotesStore();
  const active = state.loaded && state.courseId === courseId;
  const notes = active ? state.notes : EMPTY_NOTES;
  return {
    notes,
    loaded: active,
    refresh: state.refresh,
    create: (draft: Omit<NoteDraft, 'courseId'>) => state.create({ ...draft, courseId }),
    update: (id: string, patch: NotePatch) => state.update(id, patch, courseId),
    remove: (id: string) => state.remove(id, courseId),
  };
}
