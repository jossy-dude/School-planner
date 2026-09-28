import { create } from 'zustand';
import { StoredFile } from '@/db/schema';
import { FileDraft } from './logic';
import { deleteFileRow, getFileById, insertFile, listAllFiles, listFilesByCourse } from './queries';
import { deleteSandboxFile } from './storage';

interface FilesState {
  all: StoredFile[];
  loadedAll: boolean;
  // Per-course cache: the Vault can have several subject folders expanded
  // (and thus several courses' file lists resident) at once.
  byCourse: Record<string, StoredFile[]>;
  refreshAll: () => Promise<void>;
  refreshCourse: (courseId: string) => Promise<void>;
  add: (draft: FileDraft) => Promise<StoredFile>;
  remove: (id: string) => Promise<void>;
}

export const useFilesStore = create<FilesState>((set, get) => ({
  all: [],
  loadedAll: false,
  byCourse: {},
  refreshAll: async () => {
    try {
      set({ all: await listAllFiles(), loadedAll: true });
    } catch {
      set({ loadedAll: true });
    }
  },
  refreshCourse: async (courseId) => {
    try {
      const rows = await listFilesByCourse(courseId);
      set((s) => ({ byCourse: { ...s.byCourse, [courseId]: rows } }));
    } catch {
      set((s) => ({ byCourse: { ...s.byCourse, [courseId]: s.byCourse[courseId] ?? [] } }));
    }
  },
  add: async (draft) => {
    const row = await insertFile(draft);
    await get().refreshAll();
    if (draft.courseId) await get().refreshCourse(draft.courseId);
    return row;
  },
  remove: async (id) => {
    const row = await getFileById(id);
    await deleteFileRow(id);
    if (row) deleteSandboxFile(row.sandboxUri);
    await get().refreshAll();
    if (row?.courseId) await get().refreshCourse(row.courseId);
  },
}));

const EMPTY_FILES: StoredFile[] = [];

export function useCourseFiles(courseId: string) {
  const rows = useFilesStore((s) => s.byCourse[courseId]);
  const refreshCourse = useFilesStore((s) => s.refreshCourse);
  return {
    files: rows ?? EMPTY_FILES,
    loaded: rows !== undefined,
    refresh: () => refreshCourse(courseId),
  };
}
