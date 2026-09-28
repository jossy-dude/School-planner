import { INSERT_ORDER } from '@/features/backup/tables';
import { autoSeedIfEmpty, loadSampleData } from '../seed';
import { SAMPLE_FILES } from '../sampleData';

jest.mock('@/features/backup/apply', () => ({ applyTables: jest.fn(() => true) }));
jest.mock('@/db', () => ({ db: { select: jest.fn() } }));
jest.mock('expo-file-system', () => ({
  Directory: jest.fn(),
  File: jest.fn(),
  Paths: { document: 'doc://' },
}));

const { applyTables } = jest.requireMock('@/features/backup/apply') as { applyTables: jest.Mock };
const { db } = jest.requireMock('@/db') as { db: { select: jest.Mock } };
const { Directory, File } = jest.requireMock('expo-file-system') as {
  Directory: jest.Mock;
  File: jest.Mock;
};

function seedCourses(result: { id: string }[]): void {
  db.select.mockReturnValue({ from: () => ({ limit: () => Promise.resolve(result) }) });
}

beforeEach(() => {
  jest.clearAllMocks();
  Directory.mockImplementation(() => ({ exists: false, create: jest.fn() }));
  File.mockImplementation((_dir: unknown, name: string) => ({
    uri: `doc:///vault/${name}`,
    write: jest.fn(),
    size: 128,
    exists: false,
  }));
  seedCourses([]);
});

it('writes every sample file to the vault, then applies the demo semester', async () => {
  const ok = await loadSampleData();

  expect(ok).toBe(true);
  expect(applyTables).toHaveBeenCalledTimes(1);

  const tables = applyTables.mock.calls[0]![0] as Record<string, Record<string, unknown>[]>;
  expect(tables.files).toHaveLength(SAMPLE_FILES.length);
  expect(tables.files!.map((f) => f.name)).toEqual(SAMPLE_FILES.map((f) => f.name));
  for (const row of tables.files!) {
    expect(String(row.sandboxUri).startsWith('doc:///vault/')).toBe(true);
    expect(typeof row.size).toBe('number');
  }
  expect(tables.courses).toHaveLength(5);
  expect(tables.grades!.length).toBeGreaterThanOrEqual(15);
  // Every table the importer knows about, none missing — applyTables walks
  // INSERT_ORDER and skips absent keys, so a typo here would ship silently.
  expect(Object.keys(tables).sort()).toEqual([...INSERT_ORDER].sort());
});

it('seeds a database with no courses', async () => {
  seedCourses([]);

  const ok = await autoSeedIfEmpty();

  expect(ok).toBe(true);
  expect(applyTables).toHaveBeenCalledTimes(1);
});

it('never overwrites a database that already has courses', async () => {
  seedCourses([{ id: 'c-existing' }]);

  const ok = await autoSeedIfEmpty();

  expect(ok).toBe(false);
  expect(applyTables).not.toHaveBeenCalled();
});

it('leaves the database alone when it cannot be read', async () => {
  db.select.mockReturnValue({ from: () => ({ limit: () => Promise.reject(new Error('no db')) }) });

  const ok = await autoSeedIfEmpty();

  expect(ok).toBe(false);
  expect(applyTables).not.toHaveBeenCalled();
});
