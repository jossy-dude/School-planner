import type { Course } from '@/db/schema';
import { buildDaySections } from '../daySections';

const courses = [{ id: 'c1', name: 'Physics', emoji: '⚛' }] as unknown as Course[];
const occ = (id: string, startMs: number) => ({
  id, courseId: 'c1', dateId: '2026-09-28', startMs, endMs: startMs + 1, patternId: 'p', kind: 'pattern' as const,
});

it('sorts classes by start and drops empty sections', () => {
  const sections = buildDaySections({ occurrences: [occ('b', 20), occ('a', 10)], events: [], absences: [], courses });
  expect(sections.map((s) => s.key)).toEqual(['CLASSES']);
  expect(sections[0]?.rows.map((r) => r.key)).toEqual(['a', 'b']);
  expect(sections[0]?.rows[0]).toMatchObject({ title: 'Physics', emoji: '⚛' });
});

it('splits events by kind, hides done tasks, and marks event rows draggable via eventId', () => {
  const events = [
    { id: 't', kind: 'test' as const, done: false, dueAtMs: 5, title: 'Midterm' },
    { id: 'a1', kind: 'assignment' as const, done: false, dueAtMs: 6, title: 'Lab' },
    { id: 'a2', kind: 'assignment' as const, done: true, dueAtMs: 7, title: 'Old' },
    { id: 'k', kind: 'club' as const, done: false, dueAtMs: 8 },
  ];
  const sections = buildDaySections({ occurrences: [], events, absences: [], courses });
  expect(sections.map((s) => s.key)).toEqual(['EXAMS', 'TASKS', 'CLUBS']);
  expect(sections[1]?.rows.map((r) => r.eventId)).toEqual(['a1']);
  expect(sections[2]?.rows[0]?.title).toBe('CLUB');
});
