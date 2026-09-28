import { StoredFile } from '@/db/schema';
import { SAMPLE_FILES, buildSampleTables } from '../sampleData';
import { TABLES } from '@/features/backup/tables';

const NOW = new Date(2026, 8, 28, 14, 30); // Monday 2026-09-28, local time
const tables = buildSampleTables(NOW);

const DATE_ID = /^\d{4}-\d{2}-\d{2}$/;

function ids(name: keyof typeof TABLES): string[] {
  return (tables[name] as Record<string, unknown>[]).map((row) => String(row.id));
}

function unique(name: keyof typeof TABLES): void {
  expect(new Set(ids(name)).size).toBe(ids(name).length);
}

it('fills every table the backup format knows about', () => {
  expect(Object.keys(tables).sort()).toEqual(Object.keys(TABLES).sort());
});

it('keeps children pointing at parents', () => {
  const courseIds = new Set(ids('courses'));
  const categoryIds = new Set(ids('gradeCategories'));
  const patternIds = new Set(ids('schedulePatterns'));

  for (const row of tables.schedulePatterns) expect(courseIds.has(String(row.courseId))).toBe(true);
  for (const row of tables.grades) {
    expect(courseIds.has(String(row.courseId))).toBe(true);
    expect(categoryIds.has(String(row.categoryId))).toBe(true);
  }
  for (const row of tables.gradeCategories) expect(courseIds.has(String(row.courseId))).toBe(true);
  for (const row of tables.attendance) expect(courseIds.has(String(row.courseId))).toBe(true);
  for (const row of tables.notes) expect(courseIds.has(String(row.courseId))).toBe(true);
  for (const row of tables.studySessions) expect(courseIds.has(String(row.courseId))).toBe(true);
  for (const row of tables.studyPromises) expect(courseIds.has(String(row.courseId))).toBe(true);
  for (const row of tables.events) {
    if (row.courseId !== null) expect(courseIds.has(String(row.courseId))).toBe(true);
  }
  for (const row of tables.scheduleExceptions) {
    expect(courseIds.has(String(row.courseId))).toBe(true);
    if (row.patternId !== null) expect(patternIds.has(String(row.patternId))).toBe(true);
  }
});

it('gives every table unique ids', () => {
  (Object.keys(TABLES) as (keyof typeof TABLES)[]).forEach((name) => {
    if (name === 'settings') return; // keyed by `key`, not `id`
    unique(name);
  });
  const settingKeys = (tables.settings as { key: string }[]).map((row) => row.key);
  expect(new Set(settingKeys).size).toBe(settingKeys.length);
});

it('anchors the semester, timetable and dates around today', () => {
  const today = '2026-09-28';
  const term = tables.terms[0] as { startDate: string; endDate: string };
  expect(term.startDate < today).toBe(true);
  expect(term.endDate > today).toBe(true);

  // Every weekday has at least one class, so no day opens into an empty hero card.
  const weekdays = new Set((tables.schedulePatterns as { weekday: number }[]).map((p) => p.weekday));
  expect([...weekdays].sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);

  // One event due today, one already overdue, one still ahead, one done.
  const dueToday = (tables.events as { dueAt: number }[]).filter(
    (e) => new Date(e.dueAt).toDateString() === new Date(NOW).toDateString(),
  );
  const overdue = (tables.events as { dueAt: number; done: boolean }[]).filter((e) => e.dueAt < NOW.getTime() && !e.done);
  const upcoming = (tables.events as { dueAt: number }[]).filter((e) => e.dueAt > NOW.getTime());
  expect(dueToday.length).toBeGreaterThanOrEqual(1);
  expect(overdue.length).toBeGreaterThanOrEqual(1);
  expect(upcoming.length).toBeGreaterThanOrEqual(3);
  expect((tables.events as { done: boolean }[]).filter((e) => e.done).length).toBeGreaterThanOrEqual(2);
});

it('stamps attendance only in the past, with a believable mix', () => {
  const rows = tables.attendance as { date: string; status: string }[];
  expect(rows.length).toBeGreaterThanOrEqual(20);
  for (const row of rows) {
    expect(row.date).toMatch(DATE_ID);
    expect(row.date < '2026-09-28').toBe(true);
    expect(['present', 'absent', 'late']).toContain(row.status);
  }
  const present = rows.filter((r) => r.status === 'present').length;
  expect(present).toBeGreaterThan(rows.length * 0.5);
});

it('uses real Date objects where drizzle demands them', () => {
  for (const row of tables.events) expect(row.dueAt).toBeInstanceOf(Date);
  for (const row of tables.studySessions) expect(row.startedAt).toBeInstanceOf(Date);
  for (const row of tables.events) expect(Number.isNaN((row.dueAt as Date).getTime())).toBe(false);
});

it('is rich enough to fill every screen', () => {
  expect(tables.courses.length).toBe(5);
  expect(tables.schedulePatterns.length).toBeGreaterThanOrEqual(12);
  expect(tables.grades.length).toBeGreaterThanOrEqual(15);
  expect(tables.notes.length).toBeGreaterThanOrEqual(8);
  expect(tables.studySessions.length).toBe(7);
  expect(tables.studyPromises.length).toBeGreaterThanOrEqual(2);
  expect(tables.gpaScales.length).toBeGreaterThanOrEqual(1);
  expect(SAMPLE_FILES.length).toBeGreaterThanOrEqual(6);
});

it('carries the seeder-written files through to the files table', () => {
  expect(tables.files).toHaveLength(0); // nothing passed in

  const written = SAMPLE_FILES.map((spec, index) => ({
    id: spec.id, courseId: spec.courseId, category: spec.category, name: spec.name,
    sandboxUri: `file:///vault/${index}.txt`, size: spec.body.length, mime: 'text/plain',
    description: spec.description, addedAt: NOW, updatedAt: NOW,
  })) as unknown as StoredFile[];

  const seeded = buildSampleTables(NOW, written);
  expect(seeded.files).toHaveLength(SAMPLE_FILES.length);
  expect(seeded.files).toEqual(written);
  // At least one MISC file, or the Vault's uncategorized folder never renders.
  expect(SAMPLE_FILES.some((f) => f.courseId === null)).toBe(true);
  expect(SAMPLE_FILES.every((f) => f.body.length > 0)).toBe(true);
});

it('is deterministic for a fixed clock', () => {
  expect(buildSampleTables(NOW)).toEqual(buildSampleTables(NOW));
});
