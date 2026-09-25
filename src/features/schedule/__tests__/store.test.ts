import { Pattern, ScheduleException } from '@/db/schema';
import { useScheduleStore } from '../store';

jest.mock('../queries', () => ({
  listPatterns: jest.fn(),
  listExceptions: jest.fn(),
  upsertPattern: jest.fn(),
  removePattern: jest.fn(),
  upsertException: jest.fn(),
  removeException: jest.fn(),
}));

const queries = jest.requireMock('../queries') as {
  listPatterns: jest.Mock;
  listExceptions: jest.Mock;
  upsertPattern: jest.Mock;
  removePattern: jest.Mock;
  upsertException: jest.Mock;
  removeException: jest.Mock;
};

const pattern = {
  id: 'p1', courseId: 'c1', weekday: 1, startTime: '09:00', endTime: '10:30',
  location: null, validFrom: null, validTo: null, updatedAt: new Date(),
} as unknown as Pattern;

const exception = {
  id: 'e1', courseId: 'c1', patternId: 'p1', date: '2026-09-28', kind: 'cancelled',
  startTime: null, endTime: null, updatedAt: new Date(),
} as unknown as ScheduleException;

const draft = { courseId: 'c1', weekday: 1, startTime: '09:00', endTime: '10:30' } as const;

beforeEach(() => {
  jest.clearAllMocks();
  useScheduleStore.setState({ patterns: [], exceptions: [], loaded: false });
  queries.listPatterns.mockResolvedValue([pattern]);
  queries.listExceptions.mockResolvedValue([exception]);
});

it('refresh loads patterns and exceptions and marks loaded', async () => {
  await useScheduleStore.getState().refresh();
  const s = useScheduleStore.getState();
  expect(s.patterns).toEqual([pattern]);
  expect(s.exceptions).toEqual([exception]);
  expect(s.loaded).toBe(true);
});

it('savePattern upserts, refreshes, and returns the row', async () => {
  queries.upsertPattern.mockResolvedValue(pattern);
  const saved = await useScheduleStore.getState().savePattern(draft);
  expect(queries.upsertPattern).toHaveBeenCalledWith(draft);
  expect(saved).toEqual(pattern);
  expect(queries.listPatterns).toHaveBeenCalled();
  expect(useScheduleStore.getState().patterns).toEqual([pattern]);
});

it('removePattern deletes then refreshes', async () => {
  await useScheduleStore.getState().removePattern('p1');
  expect(queries.removePattern).toHaveBeenCalledWith('p1');
  expect(queries.listPatterns).toHaveBeenCalled();
  expect(useScheduleStore.getState().patterns).toEqual([pattern]);
});

it('saveException upserts and removeException deletes, both refreshing', async () => {
  queries.upsertException.mockResolvedValue(exception);
  const saved = await useScheduleStore.getState().saveException({
    courseId: 'c1', date: '2026-09-28', kind: 'cancelled',
  });
  expect(queries.upsertException).toHaveBeenCalledWith({
    courseId: 'c1', date: '2026-09-28', kind: 'cancelled',
  });
  expect(saved).toEqual(exception);
  await useScheduleStore.getState().removeException('e1');
  expect(queries.removeException).toHaveBeenCalledWith('e1');
  expect(useScheduleStore.getState().exceptions).toEqual([exception]);
});
