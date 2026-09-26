import renderer, { act } from 'react-test-renderer';
import { StudyPromise, StudySession } from '@/db/schema';
import { PromiseBar } from '@/features/today/components/PromiseBar';
import { TickBar } from '@/ui/tickbar';
import { usePromisesStore } from '../store';

jest.mock('../queries', () => ({
  listPromises: jest.fn(),
  insertPromise: jest.fn(),
  removePromise: jest.fn(),
  listSessionsSince: jest.fn(),
}));

const queries = jest.requireMock('../queries') as {
  listPromises: jest.Mock;
  insertPromise: jest.Mock;
  removePromise: jest.Mock;
  listSessionsSince: jest.Mock;
};

// Monday Sep 28 2026, noon.
const NOW = new Date(2026, 8, 28, 12).getTime();

const promiseRow = (over: Partial<StudyPromise> = {}): StudyPromise =>
  ({
    id: 'p1', courseId: 'c1', subject: 'Maths', targetMin: 60, period: 'week',
    updatedAt: new Date(), ...over,
  }) as StudyPromise;

const sessionRow = (durationMin: number): StudySession =>
  ({
    id: 's1', courseId: 'c1', startedAt: new Date(2026, 8, 28, 9), durationMin,
    note: null, updatedAt: new Date(),
  }) as StudySession;

// react-test-renderer unwraps memo() fibers — look TickBar up by its inner type.
const findTickBar = (tree: renderer.ReactTestRenderer) =>
  tree.root.findByType(TickBar.type);

const store = () => usePromisesStore.getState();

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
  queries.listPromises.mockResolvedValue([]);
  queries.insertPromise.mockResolvedValue(promiseRow());
  queries.removePromise.mockResolvedValue(undefined);
  queries.listSessionsSince.mockResolvedValue([]);
  usePromisesStore.setState({ promises: [], sessions: [], weekStart: 'monday', loaded: false });
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('refresh queries sessions since the week window start (covers day promises)', async () => {
  // Wed Sep 30 with week_start sunday → window opens Sun Sep 27 local midnight.
  jest.spyOn(Date, 'now').mockReturnValue(new Date(2026, 8, 30, 12).getTime());
  await store().refresh('sunday');
  expect(queries.listSessionsSince).toHaveBeenCalledWith(new Date(2026, 8, 27).getTime());
  expect(store().weekStart).toBe('sunday');
  expect(store().loaded).toBe(true);
});

it('refresh maps session rows to startedAtMs for promiseProgress', async () => {
  queries.listSessionsSince.mockResolvedValue([sessionRow(45)]);
  await store().refresh('monday');
  expect(store().sessions).toEqual([
    { startedAtMs: new Date(2026, 8, 28, 9).getTime(), durationMin: 45, courseId: 'c1' },
  ]);
});

it('add inserts the draft then reloads with the stored weekStart', async () => {
  await store().refresh('sunday');
  const before = queries.listSessionsSince.mock.calls.length;
  await store().add({ courseId: null, subject: 'Reading', targetMin: 30, period: 'day' });
  expect(queries.insertPromise).toHaveBeenCalledWith({ courseId: null, subject: 'Reading', targetMin: 30, period: 'day' });
  expect(queries.listSessionsSince.mock.calls.length).toBe(before + 1);
  expect(queries.listSessionsSince).toHaveBeenLastCalledWith(new Date(2026, 8, 27).getTime());
});

it('remove deletes the row then reloads', async () => {
  await store().refresh('monday');
  await store().remove('p1');
  expect(queries.removePromise).toHaveBeenCalledWith('p1');
  expect(queries.listPromises).toHaveBeenCalledTimes(2);
});

it('a logged session surfaces through the store and ticks the PromiseBar ratio', async () => {
  queries.listPromises.mockResolvedValue([promiseRow()]);

  function Harness() {
    const promises = usePromisesStore((s) => s.promises);
    const sessions = usePromisesStore((s) => s.sessions);
    const first = promises[0];
    if (first === undefined) return null;
    return <PromiseBar promise={first} sessions={sessions} nowMs={NOW} weekStart="monday" emoji="📘" />;
  }

  let tree: renderer.ReactTestRenderer | undefined;
  await act(async () => {
    await store().refresh('monday'); // no sessions yet
    tree = renderer.create(<Harness />);
  });
  expect(findTickBar(tree!).props.progress).toBe(0);
  expect(JSON.stringify(tree!.toJSON())).toContain('"0/60"');

  // "insert session" → next refresh picks the row up → ratio ticks.
  queries.listSessionsSince.mockResolvedValue([sessionRow(45)]);
  await act(async () => {
    await store().refresh('monday');
  });
  expect(findTickBar(tree!).props.progress).toBe(0.75);
  expect(JSON.stringify(tree!.toJSON())).toContain('"45/60"');

  await act(async () => { tree!.unmount(); });
});
