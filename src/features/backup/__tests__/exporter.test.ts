import { Alert } from 'react-native';
import { strFromU8, unzipSync } from 'fflate';
import { courses } from '@/db/schema';
import { parseBackupJson } from '@/lib/backup/logic';
import { exportBackup } from '../exporter';

jest.mock('@/db', () => ({ db: { select: jest.fn() } }));
jest.mock('expo-file-system', () => ({ Paths: { document: 'file:///documents' }, File: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'SUCCESS' },
}));
jest.mock('@/features/settings/queries', () => ({ writeSetting: jest.fn() }));

const { db } = jest.requireMock('@/db') as { db: { select: jest.Mock } };
const { File, Paths } = jest.requireMock('expo-file-system') as { File: jest.Mock; Paths: { document: string } };
const sharing = jest.requireMock('expo-sharing') as { isAvailableAsync: jest.Mock; shareAsync: jest.Mock };
const Haptics = jest.requireMock('expo-haptics') as {
  notificationAsync: jest.Mock;
  NotificationFeedbackType: { Success: string };
};
const { writeSetting } = jest.requireMock('@/features/settings/queries') as { writeSetting: jest.Mock };

let fileInstance: { create: jest.Mock; write: jest.Mock; uri: string };

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  fileInstance = { create: jest.fn(), write: jest.fn(), uri: 'file:///documents/backups/backup.zip' };
  File.mockImplementation(() => fileInstance);
  db.select.mockReturnValue({
    from: jest.fn((table: unknown) => Promise.resolve(table === courses ? [{ id: 'c1', name: 'Maths' }] : [])),
  });
  sharing.isAvailableAsync.mockResolvedValue(true);
  sharing.shareAsync.mockResolvedValue(undefined);
  writeSetting.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('zips data.json, writes the dated file, stamps backup_last_at, then shares', async () => {
  await exportBackup();

  expect(File).toHaveBeenCalledWith(
    Paths.document,
    'backups',
    expect.stringMatching(/^backup-\d{4}-\d{2}-\d{2}\.zip$/),
  );
  expect(fileInstance.create).toHaveBeenCalledWith({ intermediates: true, overwrite: true });

  const written = fileInstance.write.mock.calls[0]?.[0] as Uint8Array;
  const entries = unzipSync(written);
  expect(Object.keys(entries)).toEqual(['data.json']);
  const parsed = parseBackupJson(strFromU8(entries['data.json']!));
  expect(parsed).not.toBeNull();
  expect(parsed?.manifest.app).toBe('school-planner');
  expect(Object.keys(parsed!.manifest.tables)).toHaveLength(14);
  expect(parsed?.manifest.tables.courses).toBe(1);
  expect(parsed?.tables.courses).toEqual([{ id: 'c1', name: 'Maths' }]);
  expect(parsed?.tables.terms).toEqual([]);

  expect(writeSetting).toHaveBeenCalledWith('backup_last_at', expect.any(Number));
  expect(fileInstance.write.mock.invocationCallOrder[0]).toBeLessThan(writeSetting.mock.invocationCallOrder[0]!);
  expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
  expect(fileInstance.write.mock.invocationCallOrder[0])
    .toBeLessThan(Haptics.notificationAsync.mock.invocationCallOrder[0]!);
  expect(sharing.shareAsync).toHaveBeenCalledWith(fileInstance.uri, { mimeType: 'application/zip' });
  expect(Alert.alert).not.toHaveBeenCalled();
});

it('does not stamp backup_last_at when the zip write throws', async () => {
  fileInstance.write.mockImplementation(() => {
    throw new Error('disk full');
  });

  await expect(exportBackup()).resolves.toBeUndefined();

  expect(writeSetting).not.toHaveBeenCalled();
  expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  expect(sharing.shareAsync).not.toHaveBeenCalled();
  expect(Alert.alert).toHaveBeenCalledWith('Export failed', expect.any(String));
});

it('silent export writes and stamps without ever touching the share sheet', async () => {
  await exportBackup({ silent: true });

  expect(fileInstance.write).toHaveBeenCalled();
  expect(writeSetting).toHaveBeenCalledWith('backup_last_at', expect.any(Number));
  expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
  expect(sharing.isAvailableAsync).not.toHaveBeenCalled();
  expect(sharing.shareAsync).not.toHaveBeenCalled();
  expect(Alert.alert).not.toHaveBeenCalled();
});

it('alerts when sharing is unavailable instead of opening a sheet', async () => {
  sharing.isAvailableAsync.mockResolvedValue(false);

  await exportBackup();

  expect(sharing.shareAsync).not.toHaveBeenCalled();
  expect(Alert.alert).toHaveBeenCalledWith('Share unavailable', expect.any(String));
  expect(writeSetting).toHaveBeenCalled();
});
