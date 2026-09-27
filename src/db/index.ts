import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from './drizzle/migrations';
import * as schema from './schema';

type AppDb = ReturnType<typeof createDb>;

function createDb(handle: SQLite.SQLiteDatabase) {
  return drizzle(handle, { schema });
}

let openError: unknown = null;
let expoDb: SQLite.SQLiteDatabase | null = null;
let dbImpl: AppDb | null = null;
try {
  expoDb = SQLite.openDatabaseSync('school-planner.db');
  dbImpl = createDb(expoDb);
} catch (e) {
  openError = e;
  expoDb = null;
  dbImpl = null;
}

export const db: AppDb =
  dbImpl ??
  (new Proxy({} as AppDb, {
    get() {
      throw openError;
    },
  }));

let migrated = false;
export async function migrateNow(): Promise<void> {
  if (migrated) return;
  if (openError) throw openError;
  expoDb!.execSync('PRAGMA foreign_keys = ON');
  expoDb!.execSync('PRAGMA journal_mode = WAL');
  await migrate(db, migrations);
  migrated = true;
}
