import { Course } from '@/db/schema';
import { useCoursesStore } from '../store';

jest.mock('../queries', () => ({
  listCourses: jest.fn(),
  getCourse: jest.fn(),
  insertCourse: jest.fn(),
  patchCourse: jest.fn(),
  removeCourse: jest.fn(),
}));

jest.mock('@/features/reminders/refresh', () => ({
  refreshReminders: jest.fn().mockResolvedValue(undefined),
}));

// The real schedule store would fan out into its own queries — assert the seam
// (that remove() reaches it) rather than the internals.
jest.mock('@/features/schedule/store', () => {
  const refresh = jest.fn().mockResolvedValue(undefined);
  return { useScheduleStore: { getState: () => ({ refresh }) } };
});

const queries = jest.requireMock('../queries') as {
  listCourses: jest.Mock;
  insertCourse: jest.Mock;
  patchCourse: jest.Mock;
  removeCourse: jest.Mock;
};

const { refreshReminders } = jest.requireMock('@/features/reminders/refresh') as {
  refreshReminders: jest.Mock;
};

const { useScheduleStore } = jest.requireMock('@/features/schedule/store') as {
  useScheduleStore: { getState: () => { refresh: jest.Mock } };
};

const draft = {
  name: 'Maths', code: 'M1', emoji: '📘', color: '#141414', pattern: 'dots',
  credits: 3, defaultDurationMin: 60, termId: null, reminderLeadOverrideMin: null,
} as const;

const row = { id: 'c1', ...draft, bannerUri: null, updatedAt: new Date() } as unknown as Course;

beforeEach(() => {
  jest.clearAllMocks();
  useCoursesStore.setState({ courses: [], loaded: false });
  queries.listCourses.mockResolvedValue([row]);
});

it('refresh loads courses and marks loaded', async () => {
  await useCoursesStore.getState().refresh();
  const s = useCoursesStore.getState();
  expect(s.courses).toEqual([row]);
  expect(s.loaded).toBe(true);
  expect(refreshReminders).toHaveBeenCalledTimes(1);
});

it('create inserts the draft, refreshes, and returns the row', async () => {
  queries.insertCourse.mockResolvedValue(row);
  const created = await useCoursesStore.getState().create(draft);
  expect(queries.insertCourse).toHaveBeenCalledWith(draft);
  expect(queries.listCourses).toHaveBeenCalled();
  expect(created).toEqual(row);
  expect(useCoursesStore.getState().courses).toEqual([row]);
  // A course created with a lead override must reach the scheduler too.
  expect(refreshReminders).toHaveBeenCalled();
});

it('update patches then refreshes and reschedules reminders', async () => {
  await useCoursesStore.getState().update('c1', { name: 'Physics' });
  expect(queries.patchCourse).toHaveBeenCalledWith('c1', { name: 'Physics' });
  expect(queries.listCourses).toHaveBeenCalled();
  // Course lead overrides feed reminder planning — every update funnels a refresh.
  expect(refreshReminders).toHaveBeenCalled();
});

it('remove deletes then refreshes, resyncs the schedule store, and reschedules reminders', async () => {
  await useCoursesStore.getState().remove('c1');
  expect(queries.removeCourse).toHaveBeenCalledWith('c1');
  expect(queries.listCourses).toHaveBeenCalled();
  expect(useCoursesStore.getState().courses).toEqual([row]);
  // The DB cascades patterns/exceptions, so nothing else would resync them.
  expect(useScheduleStore.getState().refresh).toHaveBeenCalled();
  expect(refreshReminders).toHaveBeenCalled();
});
