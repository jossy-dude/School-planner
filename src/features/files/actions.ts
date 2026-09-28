import { Alert } from 'react-native';
import { StoredFile } from '@/db/schema';
import { shareStoredFile } from './storage';

export async function openStoredFile(file: StoredFile): Promise<void> {
  try {
    await shareStoredFile(file.sandboxUri, file.mime);
  } catch {
    Alert.alert(
      'Could not open file',
      'This file could not be found on this device. Files restored from a backup keep their name but not their contents — re-add it from the original device.',
    );
  }
}

export function confirmDeleteFile(file: StoredFile, onConfirm: () => void): void {
  Alert.alert('Delete file?', `${file.name} will be permanently removed.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}
