import { dayDotInfo, dayDots } from '../dots';
const occ = [{ id: 'a', courseId: 'c1', dateId: '2026-09-28', startMs: 1, endMs: 2, patternId: 'p', kind: 'pattern' as const }];
it('counts classes and flags absence/exam/task', () => {
  const info = dayDotInfo('2026-09-28', occ,
    [{ id: 'e1', kind: 'test', done: false, dueAtMs: 1 }, { id: 'e2', kind: 'club', done: false, dueAtMs: 1 }],
    [{ date: '2026-09-28' }]);
  expect(info.classCount).toBe(1);
  expect(info.hasAbsence).toBe(true);
  expect(info.examCount).toBe(1);
  expect(info.taskCount).toBe(0);
  expect(info.clubCount).toBe(1);
});
it('wrong date returns zeros', () => {
  expect(dayDotInfo('2026-09-29', occ, [], [])).toEqual({ classCount: 0, hasAbsence: false, examCount: 0, taskCount: 0, clubCount: 0 });
});
it('counts every matching event, not just presence', () => {
  const info = dayDotInfo('2026-09-28', occ, [
    { id: 'e1', kind: 'test', done: false, dueAtMs: 1 },
    { id: 'e2', kind: 'quiz', done: true, dueAtMs: 1 },
    { id: 'e3', kind: 'assignment', done: false, dueAtMs: 1 },
    { id: 'e4', kind: 'assignment', done: true, dueAtMs: 1 },
    { id: 'e5', kind: 'club', done: false, dueAtMs: 1 },
    { id: 'e6', kind: 'club', done: false, dueAtMs: 1 },
  ], []);
  expect(info.examCount).toBe(2);
  expect(info.taskCount).toBe(1);
  expect(info.clubCount).toBe(2);
});

const info = dayDotInfo('2026-09-28', occ,
  [{ id: 'e1', kind: 'test', done: false, dueAtMs: 1 }, { id: 'e2', kind: 'club', done: false, dueAtMs: 1 }],
  [{ date: '2026-09-28' }]);

it('dayDots shows every category when no filter is active', () => {
  expect(dayDots(info, [])).toEqual([
    { color: '#141414', shape: 'circle' },
    { color: '#C8352A', shape: 'diamond' },
    { color: '#8C8C8C', shape: 'circle' },
    { color: '#C8352A', shape: 'circle' },
  ]);
});

it('dayDots keeps only active categories plus the absence dot', () => {
  expect(dayDots(info, ['TASKS'])).toEqual([
    { color: '#C8352A', shape: 'circle' },
  ]);
  expect(dayDots(info, ['CLASSES'])).toEqual([
    { color: '#141414', shape: 'circle' },
    { color: '#C8352A', shape: 'circle' },
  ]);
});
