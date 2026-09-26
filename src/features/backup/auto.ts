import { DEFAULT_SETTINGS } from '@/features/settings/logic';
import { readAllSettings } from '@/features/settings/queries';
import { shouldAutoBackup } from '@/lib/backup/logic';
import { exportBackup } from './exporter';

// Read through settings queries, not the zustand store — this runs at root mount,
// before the settings screen (or anything else) has hydrated the store.
export async function runAutoBackup(): Promise<void> {
  try {
    const stored = await readAllSettings();
    const last = typeof stored.backup_last_at === 'number' ? stored.backup_last_at : null;
    const interval =
      typeof stored.backup_interval_days === 'number'
        ? stored.backup_interval_days
        : DEFAULT_SETTINGS.backup_interval_days;
    if (!shouldAutoBackup(last, interval, Date.now())) return;
    // Fire-and-forget: never blocks or crashes boot.
    await exportBackup({ silent: true }).catch(() => {});
  } catch {
    // A failed auto-backup must not surface during startup.
  }
}
