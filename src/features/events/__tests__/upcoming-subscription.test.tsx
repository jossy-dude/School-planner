import renderer from 'react-test-renderer';
import { Text } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
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

const due = new Date(2026, 8, 25, 13, 45);
const row = {
  id: 'e1', kind: 'test', title: 'Midterm', description: 'ch 1-4', courseId: null,
  dueAt: due, remindLeadOverrideMin: null, done: false, updatedAt: due,
} as unknown as SchoolEvent;
const nextDay = { ...row, id: 'e2', dueAt: new Date(2026, 8, 26, 0, 30) } as SchoolEvent;

// Guards the Today DUE subscription shape: upcoming() derives a new array per call,
// so the selector must go through useShallow — a bare `(s) => s.upcoming(3)` hands
// React's useSyncExternalStore an uncached snapshot and re-renders forever.
it('renders once per mount and once per store change, without looping', () => {
  let renders = 0;
  function Due() {
    const dueList = useEventsStore(useShallow((s) => s.upcoming(3)));
    renders += 1;
    if (renders > 10) throw new Error(`render loop: ${renders} renders`);
    return <Text>{dueList.length}</Text>;
  }

  useEventsStore.setState({ events: [row], loaded: true });
  renderer.act(() => {
    renderer.create(<Due />);
  });
  expect(renders).toBe(1);

  renderer.act(() => {
    useEventsStore.setState({ events: [row, nextDay] });
  });
  expect(renders).toBe(2);

  // State change that leaves the selection shallow-equal must not re-render.
  renderer.act(() => {
    useEventsStore.setState({ loaded: false });
  });
  expect(renders).toBe(2);
});
