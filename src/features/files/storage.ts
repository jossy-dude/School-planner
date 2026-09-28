import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { sandboxFileName } from './logic';

const VAULT_DIR = 'vault';

function vaultDirectory(): Directory {
  const dir = new Directory(Paths.document, VAULT_DIR);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

export interface PickedFile {
  name: string;
  sandboxUri: string;
  size: number;
  mime: string | null;
}

// Opens the system document picker and, unless cancelled, copies the chosen
// file into this app's own document directory — the picker's cache copy can
// be reclaimed by the OS at any time, so anything we want to keep needs its
// own permanent home before the row is written.
export async function pickAndStoreFile(): Promise<PickedFile | null> {
  const picked = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (picked.canceled) return null;
  const asset = picked.assets[0];
  if (!asset) return null;
  const dest = new File(vaultDirectory(), sandboxFileName(Crypto.randomUUID(), asset.name));
  await new File(asset.uri).copy(dest);
  return {
    name: asset.name,
    sandboxUri: dest.uri,
    size: asset.size ?? dest.size ?? 0,
    mime: asset.mimeType ?? null,
  };
}

// Best-effort: a row whose backing file is already gone must not block the
// row itself from being deleted.
export function deleteSandboxFile(sandboxUri: string): void {
  try {
    const file = new File(sandboxUri);
    if (file.exists) file.delete();
  } catch {
    // ignore
  }
}

export async function shareStoredFile(sandboxUri: string, mime: string | null): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(sandboxUri, mime ? { mimeType: mime } : undefined);
}
