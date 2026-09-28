import fs from 'node:fs';
import path from 'node:path';
import * as schema from '../schema';

const TABLES = [
  'terms', 'courses', 'schedule_patterns', 'schedule_exceptions', 'attendance',
  'events', 'grade_categories', 'grades', 'gpa_scales', 'study_sessions',
  'study_promises', 'files', 'notes', 'settings',
] as const;

const EXPORTS = [
  'terms', 'courses', 'schedulePatterns', 'scheduleExceptions', 'attendance',
  'events', 'gradeCategories', 'grades', 'gpaScales', 'studySessions',
  'studyPromises', 'files', 'notes', 'settings',
] as const;

it('exports a drizzle table for every domain table', () => {
  for (const t of EXPORTS) expect(schema).toHaveProperty(t);
  expect(EXPORTS).toHaveLength(TABLES.length);
});

it('generated migration creates every table with cascade from courses', () => {
  const dir = path.join(__dirname, '../drizzle');
  const file = fs.readdirSync(dir).find((f) => f.endsWith('.sql'));
  expect(file).toBeDefined();
  const sql = fs.readFileSync(path.join(dir, file!), 'utf8');
  for (const t of TABLES) expect(sql).toContain(`CREATE TABLE \`${t}\``);
  expect(sql).toContain('ON DELETE cascade');
  expect(sql.trimEnd().endsWith('statement-breakpoint')).toBe(false);
});
