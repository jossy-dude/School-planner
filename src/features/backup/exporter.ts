import { Alert } from 'react-native';
import { strToU8, zipSync } from 'fflate';
import { File, Paths } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { db } from '@/db';
import { buildBackupJson } from '@/lib/backup/logic';
import { toDateId } from '@/lib/schedule';
import { writeSetting } from '@/features/settings/queries';
import { TABLES } from './tables';

const BACKUP_DIR = 'backups';

export interface ExportOptions {
  silent?: boolean;
}

async function createBackupZip(): Promise<string> {
  const tables: Record<string, unknown[]> = {};
  for (const [name, table] of Object.entries(TABLES)) {
    tables[name] = (await db.select().from(table)) as unknown[];
  }
  const { payload } = buildBackupJson(tables);
  const zip = zipSync({ 'data.json': strToU8(payload) });
  const file = new File(Paths.document, BACKUP_DIR, `backup-${toDateId(new Date())}.zip`);
  file.create({ intermediates: true, overwrite: true });
  file.write(zip);
  // Stamped only after the zip is safely on disk — silent and shared exports both count.
  await writeSetting('backup_last_at', Date.now());
  return file.uri;
}

export async function exportBackup(opts: ExportOptions = {}): Promise<void> {
  const silent = opts.silent ?? false;
  const uri = await createBackupZip().catch(() => null);
  if (uri === null) {
    if (!silent) Alert.alert('Export failed', 'The backup zip could not be created.');
    return;
  }
  // Zip is on disk: both the silent and share-sheet paths earned the tick.
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  if (silent) return;
  try {
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert(
        'Share unavailable',
        'Sharing is not available on this device. The backup zip was saved to your backups folder.',
      );
      return;
    }
    await Sharing.shareAsync(uri, { mimeType: 'application/zip' });
  } catch {
    Alert.alert(
      'Share failed',
      'The share sheet could not be opened. The backup zip was saved to your backups folder.',
    );
  }
}
