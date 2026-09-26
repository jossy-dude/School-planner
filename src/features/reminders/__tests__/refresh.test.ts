import { refreshReminders } from '../refresh';

jest.mock('@/db', () => ({ db: { select: jest.fn() } }));
jest.mock('@/features/schedule/queries', () => ({ listPatterns: jest.fn(), listExceptions: jest.fn() }));
jest.mock('@/features/settings/queries', () => ({ readAllSettings: jest.fn() }));
jest.mock('@/features/events/queries', () => ({ listEventsInRange: jest.fn() }));
jest.mock('@/lib/schedule', () => ({ occurrencesInRange: jest.fn() }));
jest.mock('@/lib/reminders', () => ({ planReminders: jest.fn() }));
jest.mock('../notify', () => ({
  ensureNotificationSetup: jest.fn().mockResolvedValue(undefined),
  catchUpMissed: jest.fn().mockResolvedValue(undefined),
  rescheduleAll: jest.fn().mockResolvedValue(undefined),
}));

const { db } = jest.requireMock('@/db') as { db: { select: jest.Mock } };
const { listPatterns, listExceptions } = jest.requireMock('@/features/schedule/queries') as {
  listPatterns: jest.Mock;
  listExceptions: jest.Mock;
};
const { readAllSettings } = jest.requireMock('@/features/settings/queries') as { readAllSettings: jest.Mock };
const { listEventsInRange } = jest.requireMock('@/features/events/queries') as { listEventsInRange: jest.Mock };
const { occurrencesInRange } = jest.requireMock('@/lib/schedule') as { occurrencesInRange: jest.Mock };
const { planReminders } = jest.requireMock('@/lib/reminders') as { planReminders: jest.Mock };
const { ensureNotificationSetup, catchUpMissed, rescheduleAll } = jest.requireMock('../notify') as {
  ensureNotificationSetup: jest.Mock;
  catchUpMissed: jest.Mock;
  rescheduleAll: jest.Mock;
};

const DAY_MS = 86_400_000;

beforeEach(() => {
  jest.clearAllMocks();
  ensureNotificationSetup.mockResolvedValue(undefined);
  catchUpMissed.mockResolvedValue(undefined);
  rescheduleAll.mockResolvedValue(undefined);
  db.select.mockReturnValue({ from: jest.fn().mockResolvedValue([
    { id: 'c1', name: 'Anthro', emoji: '🏺', reminderLeadOverrideMin: 30 },
  ]) });
  listPatterns.mockResolvedValue([]);
  listExceptions.mockResolvedValue([]);
  readAllSettings.mockResolvedValue({ reminder_lead_default_min: 90 });
  occurrencesInRange.mockReturnValue([{ id: 'o1', courseId: 'c1' }]);
  planReminders.mockReturnValue([{ key: 'planned' }]);
});

it('plans occurrences and non-done events from a now..14d window, then reschedules once', async () => {
  const nowMs = Date.now();
  const due1 = nowMs + 2 * DAY_MS;
  const due2 = nowMs + 3 * DAY_MS;
  const due3 = nowMs + 5 * DAY_MS;
  listEventsInRange.mockResolvedValue([
    { id: 'e1', title: 'Midterm', dueAt: new Date(due1), done: false, remindLeadOverrideMin: 45, courseId: 'c1' },
    { id: 'e2', title: 'Done quiz', dueAt: new Date(due2), done: true, remindLeadOverrideMin: null, courseId: null },
    { id: 'e3', title: 'Essay', dueAt: new Date(due3), done: false, remindLeadOverrideMin: null, courseId: null },
  ]);

  await refreshReminders();

  expect(listEventsInRange).toHaveBeenCalledTimes(1);
  const [startMs, endMs] = listEventsInRange.mock.calls[0] as [number, number];
  expect(startMs - nowMs).toBeGreaterThanOrEqual(0);
  expect(startMs - nowMs).toBeLessThan(5_000);
  expect(endMs - startMs).toBe(14 * DAY_MS);

  expect(planReminders).toHaveBeenCalledTimes(1);
  const input = planReminders.mock.calls[0][0] as {
    occurrences: unknown;
    events: unknown[];
    nowMs: number;
    defaultLeadMin: number;
  };
  expect(input.occurrences).toEqual([{ id: 'o1', courseId: 'c1' }]);
  expect(input.events).toEqual([
    { id: 'e1', title: 'Midterm', dueAtMs: due1, done: false, leadMin: 45, courseName: 'Anthro' },
    { id: 'e3', title: 'Essay', dueAtMs: due3, done: false, leadMin: null, courseName: undefined },
  ]);
  expect(input.defaultLeadMin).toBe(90);
  expect(input.nowMs - nowMs).toBeGreaterThanOrEqual(0);

  expect(rescheduleAll).toHaveBeenCalledTimes(1);
  expect(rescheduleAll).toHaveBeenCalledWith([{ key: 'planned' }]);
  expect(ensureNotificationSetup).toHaveBeenCalledTimes(1);
  expect(catchUpMissed).toHaveBeenCalledTimes(1);
});
