import { Alert } from 'react-native';
import { strFromU8, unzipSync } from 'fflate';
import { File } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { parseBackupJson } from '@/lib/backup/logic';
import { applyTables } from './apply';

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

export async function importBackup(): Promise<void> {
  try {
    // Android matches zip pickers poorly on MIME alone, so include the generic
    // fallbacks and validate the extension below instead of trusting the filter.
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['application/zip', 'application/octet-stream', '*/*'],
      copyToCacheDirectory: true,
    });
    if (picked.canceled) return;
    const asset = picked.assets[0];
    if (!asset) return;
    if (!/\.zip$/i.test(asset.name)) {
      Alert.alert('Not a zip', 'Pick the .zip backup file exported by this app.');
      return;
    }
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
        {
          text: 'REPLACE',
          style: 'destructive',
          onPress: () => {
            if (applyTables(tables)) {
              Alert.alert('Backup restored', 'Your data was replaced with the backup.');
            } else {
              Alert.alert('Import failed', 'The backup could not be applied — no changes were made.');
            }
          },
        },
      ],
    );
  } catch {
    Alert.alert('Import failed', 'The file picker could not be opened.');
  }
}
