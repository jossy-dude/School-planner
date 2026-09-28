import { create } from 'zustand';
import { Note } from '@/db/schema';
import { NoteDraft, NotePatch } from './logic';
import { deleteNote, insertNote, listNotesByCourse, updateNote } from './queries';

interface NotesState {
  courseId: string | null;
  notes: Note[];
  loaded: boolean;
  refresh: (courseId: string) => Promise<void>;
  create: (draft: NoteDraft) => Promise<Note>;
  update: (id: string, patch: NotePatch, courseId: string) => Promise<void>;
  remove: (id: string, courseId: string) => Promise<void>;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  courseId: null,
  notes: [],
  loaded: false,
  refresh: async (courseId) => {
    const rows = await listNotesByCourse(courseId);
    set({ courseId, notes: rows, loaded: true });
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
