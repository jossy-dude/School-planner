import { db } from '@/db';
import { settings } from '@/db/schema';
import { Settings } from './logic';

export async function readAllSettings(): Promise<Partial<Settings>> {
  const rows = await db.select().from(settings);
  const out: Record<string, unknown> = {};
  for (const row of rows) out[row.key] = row.value;
  return out as Partial<Settings>;
}

export async function writeSetting(key: keyof Settings, value: unknown): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
}
