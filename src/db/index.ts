import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from './drizzle/migrations';
import * as schema from './schema';

export const expoDb = SQLite.openDatabaseSync('school-planner.db');
export const db = drizzle(expoDb, { schema });

let migrated = false;
export async function migrateNow(): Promise<void> {
  if (migrated) return;
  expoDb.execSync('PRAGMA foreign_keys = ON');
  expoDb.execSync('PRAGMA journal_mode = WAL');
  await migrate(db, migrations);
  migrated = true;
}
