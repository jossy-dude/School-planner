import renderer, { act } from 'react-test-renderer';
import { Course, GpaScale, Grade, Term } from '@/db/schema';
import { useCoursesStore } from '@/features/courses/store';
import { DEFAULT_SETTINGS } from '@/features/settings/logic';
import { useSettingsStore } from '@/features/settings/store';
import { useGpaResult, useGpaStore } from '../store';

jest.mock('../queries', () => ({
  listAllGrades: jest.fn(),
  listTerms: jest.fn(),
  listGpaScales: jest.fn(),
  upsertGpaScale: jest.fn(),
}));

jest.mock('@/features/settings/queries', () => ({
  readAllSettings: jest.fn(),
  writeSetting: jest.fn(),
}));

const queries = jest.requireMock('../queries') as {
  listAllGrades: jest.Mock;
  listTerms: jest.Mock;
  listGpaScales: jest.Mock;
  upsertGpaScale: jest.Mock;
};

const course = (id: string, termId: string | null, credits: number): Course =>
  ({
    id, termId, code: '', name: `Course ${id}`, emoji: '📘', color: '#141414', pattern: 'dots',
    bannerUri: null, credits, defaultDurationMin: 60, reminderLeadOverrideMin: null,
    updatedAt: new Date(),
  }) as Course;

const gradeOf = (id: string, courseId: string, pct: number): Grade =>
  ({
    id, courseId, categoryId: null, title: 'Mid', score: pct, maxScore: 100,
    weightOverride: null, date: '2026-09-25', note: null, updatedAt: new Date(),
  }) as Grade;

const term = (id: string): Term =>
  ({ id, name: `Term ${id}`, startDate: '2026-01-01', endDate: '2026-06-01', updatedAt: new Date() }) as Term;

const scale = { id: 'sc1', name: '5.0', rows: [], isDefault: false, updatedAt: new Date() } as GpaScale;

let tree: renderer.ReactTestRenderer | null = null;

// Fresh mount per read: every call returns useGpaResult()'s value for the
// store state at that moment (probe values captured in a function-scope
// component, same shape as the grades store test).
async function readGpa(): Promise<ReturnType<typeof useGpaResult>> {
  if (tree) {
    const previous = tree;
    tree = null;
    await act(async () => { previous.unmount(); });
  }
  let value: ReturnType<typeof useGpaResult> | null = null;
  function Probe() {
    value = useGpaResult();
    return null;
  }
  await act(async () => { tree = renderer.create(<Probe />); });
  return value!;
}

afterEach(async () => {
  if (tree) {
    const mounted = tree;
    tree = null;
    await act(async () => { mounted.unmount(); });
  }
});

beforeEach(() => {
  jest.clearAllMocks();
  useCoursesStore.setState({
    courses: [course('c1', 't1', 3), course('c2', 't2', 2)],
    loaded: true,
  });
  useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS }, hydrated: true });
  useGpaStore.setState({
    grades: [gradeOf('g1', 'c1', 90), gradeOf('g2', 'c2', 75)],
    terms: [],
    scales: [],
    mode: 'cumulative',
    selectedTermId: null,
    loaded: false,
  });
});

it('refresh loads all grades, terms and scales in one call', async () => {
  const grades = [gradeOf('g1', 'c1', 90)];
  const terms = [term('t1')];
  queries.listAllGrades.mockResolvedValue(grades);
  queries.listTerms.mockResolvedValue(terms);
  queries.listGpaScales.mockResolvedValue([scale]);
  await useGpaStore.getState().refresh();
  const s = useGpaStore.getState();
  expect(s.grades).toEqual(grades);
  expect(s.terms).toEqual(terms);
  expect(s.scales).toEqual([scale]);
  expect(s.loaded).toBe(true);
});

it('useGpaResult derives per-course finalPct and computes the GPA on the default scale', async () => {
  const r = await readGpa();
  expect(r.rows.map((row) => row.finalPct)).toEqual([90, 75]);
  // A=4 × 3cr + pointsForPct(75)=2.5 × 2cr → (12 + 5) / 5 = 3.4
  expect(r.gpa).toBeCloseTo(3.4);
  expect(r.totalCredits).toBe(5);
  expect(r.includedCount).toBe(2);
  expect(r.scale.id).toBe('default-4.0');
  expect(r.maxPoints).toBe(4);
  expect(r.rounding).toBe(2);
  expect(r.hasGrades).toBe(true);
});

it('exclusions and rounding come from settings (single source of truth)', async () => {
  await readGpa();
  await act(async () => {
    await useSettingsStore.getState().set('gpa_excluded', ['c1']);
    await useSettingsStore.getState().set('gpa_rounding', 1);
  });
  const r = await readGpa();
  expect(r.rows.find((row) => row.course.id === 'c1')?.excluded).toBe(true);
  expect(r.gpa).toBe(2.5);
  expect(r.totalCredits).toBe(2);
  expect(r.includedCount).toBe(1);
  expect(r.rounding).toBe(1);
});

it('mode "term" with a selected term filters courses by termId', async () => {
  await readGpa();
  await act(async () => {
    useGpaStore.getState().setMode('term');
    useGpaStore.getState().setSelectedTermId('t1');
  });
  const r = await readGpa();
  expect(r.rows.map((row) => row.course.id)).toEqual(['c1']);
  expect(r.gpa).toBe(4);
  expect(r.totalCredits).toBe(3);
});

it('mode "term" without a selected term keeps all courses (zero-terms UX)', async () => {
  await act(async () => { useGpaStore.getState().setMode('term'); });
  const r = await readGpa();
  expect(r.rows).toHaveLength(2);
});

it('a course with no grades has finalPct null and is left to the target solver', async () => {
  await act(async () => {
    useGpaStore.setState({ grades: [gradeOf('g1', 'c1', 90)] });
  });
  const r = await readGpa();
  const c2 = r.rows.find((row) => row.course.id === 'c2');
  expect(c2?.finalPct).toBeNull();
  // c2 contributes no points/credits to computeGpa
  expect(r.totalCredits).toBe(3);
  expect(r.gpa).toBe(4);
});
