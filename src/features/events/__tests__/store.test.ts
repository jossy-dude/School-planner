import { SchoolEvent } from '@/db/schema';
import { useEventsStore } from '../store';

jest.mock('../queries', () => ({
  listEventsInRange: jest.fn(),
  insertEvent: jest.fn(),
  patchEvent: jest.fn(),
  removeEvent: jest.fn(),
  toggleDone: jest.fn(),
}));

jest.mock('@/features/reminders/refresh', () => ({
  refreshReminders: jest.fn().mockResolvedValue(undefined),
}));

const { refreshReminders } = jest.requireMock('@/features/reminders/refresh') as {
  refreshReminders: jest.Mock;
};

const queries = jest.requireMock('../queries') as {
  listEventsInRange: jest.Mock;
  insertEvent: jest.Mock;
  patchEvent: jest.Mock;
  removeEvent: jest.Mock;
  toggleDone: jest.Mock;
};

const due = new Date(2026, 8, 25, 13, 45);
const row = {
  id: 'e1', kind: 'test', title: 'Midterm', description: 'ch 1-4', courseId: null,
  dueAt: due, remindLeadOverrideMin: null, done: false, updatedAt: due,
} as unknown as SchoolEvent;
const nextDay = { ...row, id: 'e2', dueAt: new Date(2026, 8, 26, 0, 30) } as SchoolEvent;

const draft = {
  kind: 'quiz' as const, title: 'Quiz 1', description: 'ch 3', courseId: null,
  dueAtMs: due.getTime(), remindLeadOverrideMin: 60,
};

beforeEach(() => {
  jest.clearAllMocks();
  useEventsStore.setState({ events: [], loaded: false });
  queries.listEventsInRange.mockResolvedValue([row]);
  queries.insertEvent.mockResolvedValue(row);
  queries.patchEvent.mockResolvedValue(row);
  queries.removeEvent.mockResolvedValue(undefined);
  queries.toggleDone.mockResolvedValue(row);
});

it('refresh loads events in range, marks loaded, and refreshes reminders', async () => {
  await useEventsStore.getState().refresh();
  const s = useEventsStore.getState();
  expect(s.events).toEqual([row]);
  expect(s.loaded).toBe(true);
  expect(queries.listEventsInRange).toHaveBeenCalledWith(expect.any(Number), expect.any(Number));
  expect(refreshReminders).toHaveBeenCalledTimes(1);
});

it('eventsForDate filters by local calendar day', async () => {
  queries.listEventsInRange.mockResolvedValue([row, nextDay]);
  await useEventsStore.getState().refresh();
  const s = useEventsStore.getState();
  expect(s.eventsForDate('2026-09-25').map((e) => e.id)).toEqual(['e1']);
  expect(s.eventsForDate('2026-09-26').map((e) => e.id)).toEqual(['e2']);
  expect(s.eventsForDate('2026-09-27')).toEqual([]);
});

it('create inserts the draft, refreshes, and returns the row', async () => {
  const created = await useEventsStore.getState().create(draft);
  expect(queries.insertEvent).toHaveBeenCalledWith(draft);
  expect(created).toEqual(row);
  expect(queries.listEventsInRange).toHaveBeenCalled();
  expect(useEventsStore.getState().events).toEqual([row]);
});

it('update patches then refreshes', async () => {
  await useEventsStore.getState().update('e1', { title: 'Final' });
  expect(queries.patchEvent).toHaveBeenCalledWith('e1', { title: 'Final' });
  expect(queries.listEventsInRange).toHaveBeenCalled();
});

it('remove deletes then refreshes', async () => {
  await useEventsStore.getState().remove('e1');
  expect(queries.removeEvent).toHaveBeenCalledWith('e1');
  expect(queries.listEventsInRange).toHaveBeenCalled();
});

it('toggleDone persists the new state then refreshes', async () => {
  await useEventsStore.getState().toggleDone('e1', true);
  expect(queries.toggleDone).toHaveBeenCalledWith('e1', true);
  expect(queries.listEventsInRange).toHaveBeenCalled();
});
