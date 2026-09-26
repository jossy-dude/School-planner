import { Alert } from 'react-native';
import { strToU8, zipSync } from 'fflate';
import { buildBackupJson } from '@/lib/backup/logic';
import { importBackup } from '../importer';
import { TABLES } from '../tables';

jest.mock('@/db', () => ({ db: { transaction: jest.fn() } }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-file-system', () => ({ File: jest.fn() }));

// Single ordered trace of everything the importer does: FK ops inside the
// transaction, then the post-success store refreshes.
const mockTrace: string[] = [];

jest.mock('@/features/courses/store', () => ({
  useCoursesStore: { getState: () => ({ refresh: () => { mockTrace.push('courses'); return Promise.resolve(); } }) },
}));
jest.mock('@/features/schedule/store', () => ({
  useScheduleStore: { getState: () => ({ refresh: () => { mockTrace.push('schedule'); return Promise.resolve(); } }) },
}));
jest.mock('@/features/events/store', () => ({
  useEventsStore: { getState: () => ({ refresh: () => { mockTrace.push('events'); return Promise.resolve(); } }) },
}));
jest.mock('@/features/grades/store', () => ({
  useGradesStore: {
    getState: () => ({
      courseId: 'course-1',
      refresh: (courseId: string) => { mockTrace.push(`grades:${courseId}`); return Promise.resolve(); },
    }),
  },
}));
jest.mock('@/features/notes/store', () => ({
  useNotesStore: {
    getState: () => ({
      courseId: 'course-1',
      refresh: (courseId: string) => { mockTrace.push(`notes:${courseId}`); return Promise.resolve(); },
    }),
  },
}));
jest.mock('@/features/gpa/store', () => ({
  useGpaStore: { getState: () => ({ refresh: () => { mockTrace.push('gpa'); return Promise.resolve(); } }) },
}));
jest.mock('@/features/promises/store', () => ({
  usePromisesStore: {
    getState: () => ({
      weekStart: 'monday',
      refresh: (week: string) => { mockTrace.push(`promises:${week}`); return Promise.resolve(); },
    }),
  },
}));
jest.mock('@/features/timer/store', () => ({
  useTimerStore: {
    getState: () => ({ actions: { refreshSessions: () => { mockTrace.push('timer'); return Promise.resolve(); } } }),
  },
}));
jest.mock('@/features/settings/store', () => ({
  useSettingsStore: { getState: () => ({ hydrate: () => { mockTrace.push('settings'); return Promise.resolve(); } }) },
}));
jest.mock('@/features/reminders/refresh', () => ({
  refreshReminders: () => { mockTrace.push('reminders'); return Promise.resolve(); },
}));

const { db } = jest.requireMock('@/db') as { db: { transaction: jest.Mock } };
const { getDocumentAsync } = jest.requireMock('expo-document-picker') as { getDocumentAsync: jest.Mock };
const { File } = jest.requireMock('expo-file-system') as { File: jest.Mock };

let alertSpy: jest.SpyInstance;
let fileInstance: { bytes: jest.Mock };

function nameOf(table: unknown): string {
  const entry = Object.entries(TABLES).find(([, v]) => v === table);
  return entry ? entry[0] : 'unknown';
}

const mockInsertRows: { name: string; row: Record<string, unknown> }[] = [];

const txMock = {
  delete: (table: unknown) => ({
    run: () => {
      mockTrace.push(`delete:${nameOf(table)}`);
      return {};
    },
  }),
  insert: (table: unknown) => ({
    values: (row: Record<string, unknown>) => {
      mockInsertRows.push({ name: nameOf(table), row });
      return {
        run: () => {
          mockTrace.push(`insert:${nameOf(table)}`);
          return {};
        },
      };
    },
  }),
};

function pickResult() {
  return { canceled: false, assets: [{ uri: 'file:///cache/backup.zip', name: 'backup.zip', lastModified: 0 }] };
}

function sampleBackupZip(): Uint8Array {
  const tables: Record<string, unknown[]> = {};
  for (const name of Object.keys(TABLES)) tables[name] = [{ id: `${name}-id`, updatedAt: '2026-01-02T03:04:05.000Z' }];
  const { payload } = buildBackupJson(tables);
  return zipSync({ 'data.json': strToU8(payload) });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockTrace.length = 0;
  mockInsertRows.length = 0;
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  fileInstance = { bytes: jest.fn().mockResolvedValue(sampleBackupZip()) };
  File.mockImplementation(() => fileInstance);
  getDocumentAsync.mockResolvedValue(pickResult());
  db.transaction.mockImplementation((cb: (tx: typeof txMock) => unknown) => cb(txMock));
});

afterEach(() => {
  jest.restoreAllMocks();
});

const DELETE_PINNED = [
  'delete:grades',
  'delete:gradeCategories',
  'delete:scheduleExceptions',
  'delete:schedulePatterns',
  'delete:attendance',
  'delete:events',
  'delete:studySessions',
  'delete:studyPromises',
  'delete:files',
  'delete:notes',
  'delete:courses',
  'delete:terms',
  'delete:gpaScales',
  'delete:settings',
];

const INSERT_PINNED = [
  'insert:terms',
  'insert:courses',
  'insert:schedulePatterns',
  'insert:scheduleExceptions',
  'insert:gradeCategories',
  'insert:grades',
  'insert:attendance',
  'insert:events',
  'insert:studySessions',
  'insert:studyPromises',
  'insert:files',
  'insert:notes',
  'insert:gpaScales',
  'insert:settings',
];

const REFRESH_PINNED = [
  'courses',
  'schedule',
  'events',
  'grades:course-1',
  'notes:course-1',
  'gpa',
  'promises:monday',
  'timer',
  'settings',
  'reminders',
];

it('cancelling the file picker runs no transaction', async () => {
  getDocumentAsync.mockResolvedValue({ canceled: true, assets: null });

  await importBackup();

  expect(db.transaction).not.toHaveBeenCalled();
  expect(alertSpy).not.toHaveBeenCalled();
});

it('rejects a zip whose payload is not a school-planner backup', async () => {
  const foreign = JSON.stringify({ manifest: { app: 'other', version: 1, tables: {} } });
  fileInstance.bytes.mockResolvedValue(zipSync({ 'data.json': strToU8(foreign) }));

  await importBackup();

  expect(alertSpy).toHaveBeenCalledWith('Not a backup', expect.any(String));
  expect(db.transaction).not.toHaveBeenCalled();
});

it('alerts when the picked file cannot be read as a zip', async () => {
  fileInstance.bytes.mockRejectedValue(new Error('not a zip'));

  await importBackup();

  expect(alertSpy).toHaveBeenCalledWith('Import failed', expect.any(String));
  expect(db.transaction).not.toHaveBeenCalled();
});

it('the confirm CANCEL button runs no transaction', async () => {
  await importBackup();

  const buttons = alertSpy.mock.calls[0]![2]!;
  expect(alertSpy.mock.calls[0]![0]).toBe('Replace all data?');
  expect(buttons[0]!.text).toBe('CANCEL');
  buttons[0]!.onPress!();

  expect(db.transaction).not.toHaveBeenCalled();
});

it('replaces all data in pinned FK order, then refreshes every store', async () => {
  await importBackup();

  const buttons = alertSpy.mock.calls[0]![2]!;
  expect(buttons[1]).toMatchObject({ text: 'REPLACE', style: 'destructive' });
  buttons[1]!.onPress!();

  expect(db.transaction).toHaveBeenCalledTimes(1);
  expect(mockTrace).toEqual([...DELETE_PINNED, ...INSERT_PINNED, ...REFRESH_PINNED]);
  expect(mockInsertRows[0]).toEqual({
    name: 'terms',
    row: { id: 'terms-id', updatedAt: new Date('2026-01-02T03:04:05.000Z') },
  });
  expect(alertSpy.mock.calls[1]![0]).toBe('Backup restored');
});

it('rolls back to a generic failure alert when the transaction throws', async () => {
  db.transaction.mockImplementation(() => {
    throw new Error('FOREIGN KEY constraint failed');
  });

  await importBackup();
  alertSpy.mock.calls[0]![2]![1]!.onPress!();

  expect(alertSpy).toHaveBeenLastCalledWith('Import failed', expect.stringContaining('no changes were made'));
  expect(mockTrace).toEqual([]);
});
