import { planReminders } from '../index';
const now = new Date(2026, 8, 25, 8).getTime();
const occ = { id: 'p1:2026-09-28', courseId: 'c1', dateId: '2026-09-28', startMs: new Date(2026, 8, 28, 9).getTime(), endMs: new Date(2026, 8, 28, 10).getTime(), patternId: 'p1', kind: 'pattern' as const };

it('plans class reminder at start minus lead', () => {
  const plan = planReminders({ occurrences: [occ], events: [], nowMs: now, defaultLeadMin: 60, leadByCourse: {} });
  expect(plan).toHaveLength(1);
  expect(plan[0]!.fireAtMs).toBe(occ.startMs - 3600_000);
  expect(plan[0]!.key).toBe('class:p1:2026-09-28');
});

it('course lead overrides default', () => {
  const plan = planReminders({ occurrences: [occ], events: [], nowMs: now, defaultLeadMin: 60, leadByCourse: { c1: 15 } });
  expect(plan[0]!.fireAtMs).toBe(occ.startMs - 900_000);
});

it('skips past fires and done events', () => {
  const pastOcc = { ...occ, startMs: now + 60_000, endMs: now + 120_000 }; // lead 60m => fire in past
  const plan = planReminders({
    occurrences: [pastOcc],
    events: [{ id: 'e1', title: 'Quiz', dueAtMs: now + 3600_000, done: true, leadMin: null }],
    nowMs: now, defaultLeadMin: 60, leadByCourse: {},
  });
  expect(plan).toHaveLength(0);
});

it('event lead overrides default', () => {
  const plan = planReminders({
    occurrences: [], events: [{ id: 'e1', title: 'Essay', dueAtMs: now + 7200_000, done: false, leadMin: 30 }],
    nowMs: now, defaultLeadMin: 60, leadByCourse: {},
  });
  expect(plan[0]!.fireAtMs).toBe(now + 7200_000 - 1800_000);
});

it('null course lead falls back to the default lead', () => {
  const plan = planReminders({ occurrences: [occ], events: [], nowMs: now, defaultLeadMin: 60, leadByCourse: { c1: null } });
  expect(plan[0]!.fireAtMs).toBe(occ.startMs - 3600_000);
});

it('skips done events whose fire is still in the future', () => {
  const plan = planReminders({
    occurrences: [],
    events: [
      { id: 'e1', title: 'Quiz', dueAtMs: now + 7200_000, done: true, leadMin: null },
      { id: 'e2', title: 'Essay', dueAtMs: now + 7200_000, done: false, leadMin: null },
    ],
    nowMs: now, defaultLeadMin: 60, leadByCourse: {},
  });
  expect(plan.map((r) => r.key)).toEqual(['event:e2']);
});

it('keeps the first reminder when duplicate keys appear', () => {
  const dup = { ...occ, id: 'p1:2026-09-28', dateId: '2026-09-29', startMs: occ.startMs + 86_400_000, endMs: occ.endMs + 86_400_000 };
  const plan = planReminders({ occurrences: [occ, dup], events: [], nowMs: now, defaultLeadMin: 60, leadByCourse: {} });
  expect(plan).toHaveLength(1);
  expect(plan[0]!.fireAtMs).toBe(occ.startMs - 3600_000);
});

it('drops occurrences starting beyond the horizon', () => {
  const far = { ...occ, id: 'p1:2026-10-20', dateId: '2026-10-20', startMs: now + 15 * 86_400_000, endMs: now + 15 * 86_400_000 + 3600_000 };
  const plan = planReminders({ occurrences: [occ, far], events: [], nowMs: now, defaultLeadMin: 60, leadByCourse: {} });
  expect(plan).toHaveLength(1);
  expect(plan[0]!.key).toBe('class:p1:2026-09-28');
});

it('caps at 64 sorted by fire time ascending', () => {
  const many = Array.from({ length: 70 }, (_, i) => ({
    ...occ, id: `p1:2026-09-26-${i}`, dateId: '2026-09-26',
    startMs: now + 4200_000 + i * 60_000, endMs: now + 7800_000 + i * 60_000,
  }));
  const plan = planReminders({ occurrences: many, events: [], nowMs: now, defaultLeadMin: 60, leadByCourse: {} });
  expect(plan).toHaveLength(64);
  for (let i = 1; i < plan.length; i++) {
    expect(plan[i]!.fireAtMs).toBeGreaterThanOrEqual(plan[i - 1]!.fireAtMs);
  }
  expect(plan[0]!.fireAtMs).toBe(now + 600_000);
});

it('merges classes and events sorted by fire time', () => {
  const plan = planReminders({
    occurrences: [occ],
    events: [{ id: 'e1', title: 'Essay', dueAtMs: occ.startMs + 1800_000, done: false, leadMin: null }],
    nowMs: now, defaultLeadMin: 60, leadByCourse: {},
  });
  expect(plan.map((r) => r.key)).toEqual(['class:p1:2026-09-28', 'event:e1']);
});

it('builds titles from the course and start time', () => {
  const plan = planReminders({
    occurrences: [occ], events: [], nowMs: now, defaultLeadMin: 60, leadByCourse: {},
    coursesById: { c1: { name: 'Physics', emoji: '🔭' } },
  });
  expect(plan[0]!.title).toBe('🔭 Physics starts 09:00');
  expect(plan[0]!.body).toBe('Starts at 09:00');
});

it('builds event titles from the due time and course name', () => {
  const plan = planReminders({
    occurrences: [],
    events: [{ id: 'e1', title: 'Essay', dueAtMs: now + 7200_000, done: false, leadMin: 30, courseName: 'History' }],
    nowMs: now, defaultLeadMin: 60, leadByCourse: {},
  });
  expect(plan[0]!.title).toBe('Essay due 10:00');
  expect(plan[0]!.body).toBe('Due at 10:00 · History');
});
