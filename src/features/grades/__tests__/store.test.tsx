import renderer, { act } from 'react-test-renderer';
import { Grade, GradeCategory } from '@/db/schema';
import { useGrades, useGradesStore } from '../store';

jest.mock('../queries', () => ({
  listCategories: jest.fn(),
  listGrades: jest.fn(),
  getGradeById: jest.fn(),
  insertGrade: jest.fn(),
  patchGrade: jest.fn(),
  removeGrade: jest.fn(),
  insertCategory: jest.fn(),
  removeCategory: jest.fn(),
}));

const queries = jest.requireMock('../queries') as {
  listCategories: jest.Mock;
  listGrades: jest.Mock;
  insertGrade: jest.Mock;
  patchGrade: jest.Mock;
  removeGrade: jest.Mock;
  insertCategory: jest.Mock;
  removeCategory: jest.Mock;
};

const cat = {
  id: 'cat1', courseId: 'c1', name: 'HW', weight: 40, updatedAt: new Date(),
} as GradeCategory;
const grade = {
  id: 'gr1', courseId: 'c1', categoryId: 'cat1', title: 'Mid', score: 18, maxScore: 20,
  weightOverride: null, date: '2026-09-25', note: null, updatedAt: new Date(),
} as Grade;
// 4/10 weighted ×3: (0.9×1 + 0.4×3) / 4 = 52.5%
const weighted = {
  id: 'gr2', courseId: 'c1', categoryId: null, title: 'Lab', score: 4, maxScore: 10,
  weightOverride: 3, date: '2026-09-24', note: null, updatedAt: new Date(),
} as Grade;

beforeEach(() => {
  jest.clearAllMocks();
  useGradesStore.setState({ courseId: null, categories: [], grades: [], loaded: false });
  queries.listCategories.mockResolvedValue([cat]);
  queries.listGrades.mockResolvedValue([grade]);
  queries.insertGrade.mockResolvedValue(grade);
  queries.patchGrade.mockResolvedValue(grade);
  queries.removeGrade.mockResolvedValue(undefined);
  queries.insertCategory.mockResolvedValue(cat);
  queries.removeCategory.mockResolvedValue(undefined);
});

it('refresh loads categories and grades for the course and marks loaded', async () => {
  await useGradesStore.getState().refresh('c1');
  const s = useGradesStore.getState();
  expect(s.courseId).toBe('c1');
  expect(s.categories).toEqual([cat]);
  expect(s.grades).toEqual([grade]);
  expect(s.loaded).toBe(true);
  expect(queries.listCategories).toHaveBeenCalledWith('c1');
  expect(queries.listGrades).toHaveBeenCalledWith('c1');
});

it('addGrade inserts then funnels a refresh', async () => {
  const draft = { courseId: 'c1', title: 'Mid', score: 18, maxScore: 20, date: '2026-09-25' };
  const created = await useGradesStore.getState().addGrade(draft);
  expect(queries.insertGrade).toHaveBeenCalledWith(draft);
  expect(created).toEqual(grade);
  expect(queries.listGrades).toHaveBeenCalledTimes(1);
  expect(useGradesStore.getState().grades).toEqual([grade]);
});

it('updateGrade / removeGrade / addCategory / removeCategory all funnel one refresh', async () => {
  const s = () => useGradesStore.getState();
  await s().updateGrade('gr1', { title: 'Final' }, 'c1');
  expect(queries.patchGrade).toHaveBeenCalledWith('gr1', { title: 'Final' });
  expect(queries.listGrades).toHaveBeenCalledTimes(1);

  await s().removeGrade('gr1', 'c1');
  expect(queries.removeGrade).toHaveBeenCalledWith('gr1');
  expect(queries.listGrades).toHaveBeenCalledTimes(2);

  await s().addCategory({ courseId: 'c1', name: 'HW', weight: 40 });
  expect(queries.insertCategory).toHaveBeenCalledWith({ courseId: 'c1', name: 'HW', weight: 40 });
  expect(queries.listCategories).toHaveBeenCalledTimes(3);

  await s().removeCategory('cat1', 'c1');
  expect(queries.removeCategory).toHaveBeenCalledWith('cat1');
  expect(queries.listCategories).toHaveBeenCalledTimes(4);
});

it('useGrades binds courseId into addGrade/addCategory', async () => {
  useGradesStore.setState({ courseId: 'c1', categories: [cat], grades: [grade], loaded: true });
  let out: ReturnType<typeof useGrades> | null = null;
  function Probe() {
    out = useGrades('c1');
    return null;
  }
  await act(async () => { renderer.create(<Probe />); });
  await act(async () => {
    await out!.addGrade({ title: 'Quiz', score: 5, maxScore: 10, date: '2026-09-26' });
    await out!.addCategory({ name: 'Lab', weight: 60 });
  });
  expect(queries.insertGrade).toHaveBeenCalledWith(
    expect.objectContaining({ courseId: 'c1', title: 'Quiz' }),
  );
  expect(queries.insertCategory).toHaveBeenCalledWith(
    expect.objectContaining({ courseId: 'c1', name: 'Lab' }),
  );
});

it('useGrades derives finalPct from the current grades and recomputes on change', async () => {
  useGradesStore.setState({ courseId: 'c1', categories: [cat], grades: [grade, weighted], loaded: true });
  let out: ReturnType<typeof useGrades> | null = null;
  function Probe() {
    out = useGrades('c1');
    return null;
  }
  await act(async () => { renderer.create(<Probe />); });
  expect(out!.finalPct).toBeCloseTo(52.5);

  // Deleting the ×3 grade must re-derive (0.9 + ...) → (18/20) = 90, no stale copy.
  await act(async () => { useGradesStore.setState({ grades: [grade] }); });
  expect(out!.finalPct).toBeCloseTo(90);
});

it('useGrades yields empty data and null finalPct for a different course', async () => {
  useGradesStore.setState({ courseId: 'c2', categories: [], grades: [], loaded: true });
  let out: ReturnType<typeof useGrades> | null = null;
  function Probe() {
    out = useGrades('c1');
    return null;
  }
  await act(async () => { renderer.create(<Probe />); });
  expect(out!.grades).toEqual([]);
  expect(out!.categories).toEqual([]);
  expect(out!.finalPct).toBeNull();
});
