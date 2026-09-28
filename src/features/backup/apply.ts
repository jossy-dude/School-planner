import { db } from '@/db';
import { refreshReminders } from '@/features/reminders/refresh';
import { useCoursesStore } from '@/features/courses/store';
import { useScheduleStore } from '@/features/schedule/store';
import { useEventsStore } from '@/features/events/store';
import { useFilesStore } from '@/features/files/store';
import { useGradesStore } from '@/features/grades/store';
import { useNotesStore } from '@/features/notes/store';
import { useGpaStore } from '@/features/gpa/store';
import { usePromisesStore } from '@/features/promises/store';
import { useTimerStore } from '@/features/timer/store';
import { useSettingsStore } from '@/features/settings/store';
import { DELETE_ORDER, INSERT_ORDER, TABLES } from './tables';

// Schema columns with drizzle `integer(..., { mode: 'timestamp' })` — JSON round-trips
// them to ISO strings, and drizzle's encoder demands real Date objects.
const TIMESTAMP_KEYS = ['updatedAt', 'dueAt', 'startedAt', 'addedAt'] as const;

function reviveRow(row: Record<string, unknown>): Record<string, unknown> {
  const out = { ...row };
  for (const key of TIMESTAMP_KEYS) {
    const value = out[key];
    if (typeof value === 'string') out[key] = new Date(value);
  }
  return out;
}

// One synchronous transaction: expo-sqlite's drizzle driver is sync, so the callback
// must be sync too (an async callback would COMMIT before its inserts ever ran).
// Shared by backup import and sample-data loading — both replace everything.
export function applyTables(tables: Record<string, unknown[]>): boolean {
  try {
    db.transaction((tx) => {
      for (const name of DELETE_ORDER) tx.delete(TABLES[name]).run();
      for (const name of INSERT_ORDER) {
        const rows = tables[name];
        if (!Array.isArray(rows)) continue;
        for (const row of rows) {
          const revived = reviveRow(row as Record<string, unknown>);
          tx.insert(TABLES[name]).values(revived).run();
        }
      }
    });
  } catch {
    // The transaction rolled back — nothing was written.
    return false;
  }
  refreshAfterImport();
  return true;
}

export function refreshAfterImport(): void {
  useCoursesStore.getState().refresh().catch(() => {});
  useScheduleStore.getState().refresh().catch(() => {});
  useEventsStore.getState().refresh().catch(() => {});
  // Note: only the `files` table's metadata round-trips through a backup zip —
  // the on-disk bytes at each row's sandboxUri live solely on the device that
  // stored them, so restored rows on another device open to a "not found"
  // state (handled in the Vault's open/share flow) until re-added.
  useFilesStore.getState().refreshAll().catch(() => {});
  const grades = useGradesStore.getState();
  if (grades.courseId) grades.refresh(grades.courseId).catch(() => {});
  const notes = useNotesStore.getState();
  if (notes.courseId) notes.refresh(notes.courseId).catch(() => {});
  useGpaStore.getState().refresh().catch(() => {});
  const promises = usePromisesStore.getState();
  promises.refresh(promises.weekStart).catch(() => {});
  useTimerStore.getState().actions.refreshSessions().catch(() => {});
  useSettingsStore.getState().hydrate().catch(() => {});
  refreshReminders().catch(() => {});
}
