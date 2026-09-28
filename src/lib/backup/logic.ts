export interface BackupManifest {
  app: 'school-planner';
  version: 1;
  createdAtIso: string;
  tables: Record<string, number>;
}

export interface ParsedBackup {
  manifest: BackupManifest;
  tables: Record<string, unknown[]>;
}

export function buildBackupJson(tables: Record<string, unknown[]>): { manifest: BackupManifest; payload: string } {
  const counts: Record<string, number> = {};
  for (const [name, rows] of Object.entries(tables)) counts[name] = rows.length;
  const manifest: BackupManifest = {
    app: 'school-planner',
    version: 1,
    createdAtIso: new Date().toISOString(),
    tables: counts,
  };
  return { manifest, payload: JSON.stringify({ manifest, tables }) };
}

export function parseBackupJson(json: string): ParsedBackup | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const { manifest, tables } = parsed as { manifest?: unknown; tables?: unknown };
  if (typeof manifest !== 'object' || manifest === null) return null;
  const m = manifest as { app?: unknown; version?: unknown; createdAtIso?: unknown; tables?: unknown };
  if (m.app !== 'school-planner') return null;
  if (m.version !== 1) return null;
  if (typeof tables !== 'object' || tables === null || Array.isArray(tables)) return null;
  const manifestCounts =
    typeof m.tables === 'object' && m.tables !== null && !Array.isArray(m.tables)
      ? (m.tables as Record<string, number>)
      : {};
  return {
    manifest: {
      app: 'school-planner',
      version: 1,
      createdAtIso: typeof m.createdAtIso === 'string' ? m.createdAtIso : '',
      tables: manifestCounts,
    },
    tables: tables as Record<string, unknown[]>,
  };
}

export function shouldAutoBackup(lastAtMs: number | null, intervalDays: number, nowMs: number): boolean {
  if (lastAtMs === null) return true;
  return nowMs - lastAtMs >= intervalDays * 86_400_000;
}
