import { buildBackupJson, parseBackupJson, shouldAutoBackup } from '../logic';
it('roundtrips payload', () => {
  const { manifest, payload } = buildBackupJson({ courses: [{ id: 'c1', name: 'Maths' }] });
  const parsed = parseBackupJson(payload);
  expect(parsed?.manifest.app).toBe('school-planner');
  expect(parsed?.tables.courses).toHaveLength(1);
});
it('rejects foreign or bad json', () => {
  expect(parseBackupJson('{')).toBeNull();
  expect(parseBackupJson(JSON.stringify({ app: 'other', version: 1, tables: {} }))).toBeNull();
  expect(parseBackupJson(JSON.stringify({ app: 'school-planner', version: 99, tables: {} }))).toBeNull();
});
it('auto-backup interval logic', () => {
  const day = 86_400_000;
  expect(shouldAutoBackup(null, 7, 1000)).toBe(true);
  expect(shouldAutoBackup(1000, 7, 1000 + 6 * day)).toBe(false);
  expect(shouldAutoBackup(1000, 7, 1000 + 7 * day)).toBe(true);
});

it('rejects a payload with missing or non-object tables', () => {
  const manifest = { app: 'school-planner', version: 1 };
  expect(parseBackupJson('{}')).toBeNull();
  expect(parseBackupJson(JSON.stringify({ manifest }))).toBeNull();
  expect(parseBackupJson(JSON.stringify({ manifest, tables: null }))).toBeNull();
  expect(parseBackupJson(JSON.stringify({ manifest, tables: 5 }))).toBeNull();
  expect(parseBackupJson(JSON.stringify({ manifest, tables: [] }))).toBeNull();
});

it('does not auto-backup when now precedes the last backup', () => {
  const day = 86_400_000;
  expect(shouldAutoBackup(1000 + 7 * day, 7, 1000)).toBe(false);
});
