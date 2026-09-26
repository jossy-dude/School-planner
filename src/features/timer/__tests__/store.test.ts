import { StudySession } from '@/db/schema';
import { useTimerStore } from '../store';

jest.mock('../queries', () => ({
  insertSession: jest.fn(),
  listSessions: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 'SUCCESS' },
}));

const queries = jest.requireMock('../queries') as {
  insertSession: jest.Mock;
  listSessions: jest.Mock;
};
const Haptics = jest.requireMock('expo-haptics') as {
  notificationAsync: jest.Mock;
  NotificationFeedbackType: { Success: string };
};

const MIN = 60_000;
const T0 = 1_700_000_000_000;

const initial = {
  state: { status: 'idle' as const, courseId: null, startedAtMs: null, remainingMs: 25 * MIN, targetMs: 25 * MIN },
  nowMs: 0,
  sessionStartMs: null as number | null,
  finishing: false,
  sessions: [] as StudySession[],
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(T0);
  queries.insertSession.mockResolvedValue({});
  queries.listSessions.mockResolvedValue([]);
  useTimerStore.setState({ ...initial, actions: useTimerStore.getState().actions });
});

afterEach(() => {
  jest.restoreAllMocks();
});

const actions = () => useTimerStore.getState().actions;
const store = () => useTimerStore.getState();

it('start runs with the given course and target', () => {
  actions().start('c1', 45 * MIN);
  expect(store().state).toEqual({
    status: 'running', courseId: 'c1', startedAtMs: T0, remainingMs: 45 * MIN, targetMs: 45 * MIN,
  });
  expect(store().sessionStartMs).toBe(T0);
});

it('pause projects remaining forward then freezes; resume re-stamps the anchor', () => {
  actions().start('c1', 60 * MIN);
  jest.spyOn(Date, 'now').mockReturnValue(T0 + 10 * MIN);
  actions().pause();
  expect(store().state.status).toBe('paused');
  expect(store().state.remainingMs).toBe(50 * MIN);
  jest.spyOn(Date, 'now').mockReturnValue(T0 + 30 * MIN);
  actions().tick(Date.now()); // paused tick: frozen
  expect(store().state.remainingMs).toBe(50 * MIN);
  actions().resume();
  expect(store().state.startedAtMs).toBe(T0 + 30 * MIN);
  expect(store().state.remainingMs).toBe(50 * MIN);
});

it('reset returns to idle with remaining = target', () => {
  actions().start('c1', 45 * MIN);
  actions().reset();
  expect(store().state).toEqual({
    status: 'idle', courseId: 'c1', startedAtMs: null, remainingMs: 45 * MIN, targetMs: 45 * MIN,
  });
  expect(store().sessionStartMs).toBeNull();
});

it('tick at zero persists the full target, haptics, then resets to idle', async () => {
  actions().start('c1', 60 * MIN);
  await actions().tick(T0 + 60 * MIN);
  expect(queries.insertSession).toHaveBeenCalledWith('c1', new Date(T0), 60);
  expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
  expect(store().state).toEqual({
    status: 'idle', courseId: 'c1', startedAtMs: null, remainingMs: 60 * MIN, targetMs: 60 * MIN,
  });
  expect(store().finishing).toBe(false);
  expect(queries.listSessions).toHaveBeenCalledWith(10);
});

it('tick before zero only advances the countdown', async () => {
  actions().start('c1', 60 * MIN);
  await actions().tick(T0 + 25 * MIN);
  expect(queries.insertSession).not.toHaveBeenCalled();
  expect(store().state.status).toBe('running');
  expect(store().state.remainingMs).toBe(35 * MIN);
});

it('manual finish logs rounded elapsed when it is at least a minute', async () => {
  actions().start('c1', 60 * MIN);
  actions().tick(T0 + 25 * MIN);
  await actions().finish();
  expect(queries.insertSession).toHaveBeenCalledWith('c1', new Date(T0), 25);
  expect(Haptics.notificationAsync).not.toHaveBeenCalled(); // mascot/haptic chain is auto-finish only (Task 22)
  expect(store().state.status).toBe('idle');
  expect(store().state.remainingMs).toBe(60 * MIN);
});

it('manual finish skips rows shorter than a minute', async () => {
  actions().start('c1', 60 * MIN);
  actions().tick(T0 + 20_000);
  await actions().finish();
  expect(queries.insertSession).not.toHaveBeenCalled();
  expect(store().state.status).toBe('idle');
});

it('select and setDuration are ignored while running', () => {
  actions().start('c1', 45 * MIN);
  actions().select('c2');
  actions().setDuration(90 * MIN);
  expect(store().state.courseId).toBe('c1');
  expect(store().state.targetMs).toBe(45 * MIN);
});

it('select and setDuration update the idle preview state', () => {
  actions().select('c2');
  actions().setDuration(60 * MIN);
  expect(store().state.courseId).toBe('c2');
  expect(store().state.targetMs).toBe(60 * MIN);
  expect(store().state.remainingMs).toBe(60 * MIN);
});
