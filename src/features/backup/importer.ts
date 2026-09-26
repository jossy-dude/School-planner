import { Alert } from 'react-native';
import { strFromU8, unzipSync } from 'fflate';
import { File } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { db } from '@/db';
import { parseBackupJson } from '@/lib/backup/logic';
import { refreshReminders } from '@/features/reminders/refresh';
import { useCoursesStore } from '@/features/courses/store';
import { useScheduleStore } from '@/features/schedule/store';
import { useEventsStore } from '@/features/events/store';
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

type ZipRead = { ok: true; tables: Record<string, unknown[]> } | { ok: false; reason: 'unreadable' | 'foreign' };

async function readBackupZip(uri: string): Promise<ZipRead> {
  try {
    const entries = unzipSync(await new File(uri).bytes());
    const entry = entries['data.json'];
    if (!entry) return { ok: false, reason: 'foreign' };
    const parsed = parseBackupJson(strFromU8(entry));
    if (!parsed) return { ok: false, reason: 'foreign' };
    return { ok: true, tables: parsed.tables };
  } catch {
    return { ok: false, reason: 'unreadable' };
  }
}

// One synchronous transaction: expo-sqlite's drizzle driver is sync, so the callback
// must be sync too (an async callback would COMMIT before its inserts ever ran).
function applyBackup(tables: Record<string, unknown[]>): void {
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
    // The transaction rolled back — nothing was imported, so say nothing else changed.
    Alert.alert('Import failed', 'The backup could not be applied — no changes were made.');
    return;
  }
  refreshAfterImport();
  Alert.alert('Backup restored', 'Your data was replaced with the backup.');
}

function refreshAfterImport(): void {
  useCoursesStore.getState().refresh().catch(() => {});
  useScheduleStore.getState().refresh().catch(() => {});
  useEventsStore.getState().refresh().catch(() => {});
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

export async function importBackup(): Promise<void> {
  try {
    const picked = await DocumentPicker.getDocumentAsync({
      type: 'application/zip',
      copyToCacheDirectory: true,
    });
    if (picked.canceled) return;
    const asset = picked.assets[0];
    if (!asset) return;
    const read = await readBackupZip(asset.uri);
    if (!read.ok) {
      if (read.reason === 'unreadable') {
        Alert.alert('Import failed', 'That file could not be read as a backup zip.');
      } else {
        Alert.alert('Not a backup', 'This file is not a school-planner backup.');
      }
      return;
    }
    const tables = read.tables;
    Alert.alert(
      'Replace all data?',
      'Your current courses, grades, notes, and settings will be deleted and replaced by this backup. This cannot be undone.',
      [
        // Cancel just dismisses — no transaction, no refreshes.
        { text: 'CANCEL', onPress: () => {} },
        { text: 'REPLACE', style: 'destructive', onPress: () => applyBackup(tables) },
      ],
    );
  } catch {
    Alert.alert('Import failed', 'The file picker could not be opened.');
  }
}
