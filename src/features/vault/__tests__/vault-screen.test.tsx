import { ReactElement } from 'react';
import renderer, { act } from 'react-test-renderer';
import { Course, StoredFile } from '@/db/schema';
import VaultScreen from '../../../../app/(tabs)/vault';
import { useFilesStore } from '../../files/store';
import { listFilesByCourse } from '../../files/queries';
import { listNotesByCourse } from '../../notes/queries';
import { SubjectFolder } from '../components/SubjectFolder';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useFocusEffect: jest.fn(),
}));

jest.mock('../../files/actions', () => ({
  confirmDeleteFile: jest.fn(),
  openStoredFile: jest.fn(),
}));

jest.mock('../../files/queries', () => ({
  listAllFiles: jest.fn(async () => []),
  listFilesByCourse: jest.fn(async () => []),
  getFileById: jest.fn(async () => null),
  insertFile: jest.fn(),
  deleteFileRow: jest.fn(async () => {}),
}));

jest.mock('../../notes/queries', () => ({
  listNotesByCourse: jest.fn(async () => []),
  insertNote: jest.fn(),
  updateNote: jest.fn(),
  deleteNote: jest.fn(),
  getNoteById: jest.fn(async () => null),
}));

let mounted: renderer.ReactTestRenderer | null = null;

const mountSync = (node: ReactElement): renderer.ReactTestRenderer => {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(node);
  });
  mounted = tree;
  return tree;
};

const mount = async (node: ReactElement): Promise<renderer.ReactTestRenderer> => {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(node);
  });
  mounted = tree;
  return tree;
};

const flush = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

const miscFile = {
  id: 'f1', courseId: null, category: null, name: 'Syllabus.pdf', sandboxUri: 'vault/f1',
  size: 1234, mime: 'application/pdf', description: null, addedAt: new Date(2026, 8, 25),
} as unknown as StoredFile;

const course = {
  id: 'c1', termId: null, code: 'MTH101', name: 'Algebra', emoji: '📐', color: '#111111',
  pattern: 'dots', bannerUri: null, credits: 3, defaultDurationMin: 60,
  reminderLeadOverrideMin: null, updatedAt: new Date(2026, 8, 25),
} as unknown as Course;

afterEach(() => {
  if (mounted) {
    act(() => mounted!.unmount());
    mounted = null;
  }
  act(() => {
    useFilesStore.setState({ all: [], loadedAll: true, byCourse: {} });
  });
  jest.clearAllMocks();
});

// Regression: `all.filter(...)` hands zustand v5 a fresh array on every
// snapshot, which re-renders forever ("Maximum update depth exceeded") the
// moment the tab mounts — the selector must go through useShallow.
it('mounts the Vault tab without a selector render loop', () => {
  useFilesStore.setState({ all: [miscFile], loadedAll: true });
  expect(() => mountSync(<VaultScreen />)).not.toThrow();
});

// Regression: useCourseFiles/useCourseNotesCache returned a fresh `refresh`
// closure per render, so the folder's refetch effect re-ran on every landing
// fetch — an endless SQLite loop while a folder stayed open.
it("pulls an opened folder's files and notes exactly once", async () => {
  const tree = await mount(<SubjectFolder course={course} />);
  await act(async () => {
    tree.root.findByProps({ accessibilityLabel: 'Algebra folder, collapsed' }).props.onPress();
  });
  await flush();

  const fileFetches = (listFilesByCourse as jest.Mock).mock.calls.length;
  const noteFetches = (listNotesByCourse as jest.Mock).mock.calls.length;
  expect(fileFetches).toBe(1);
  expect(noteFetches).toBe(1);

  for (let i = 0; i < 5; i++) await flush();

  expect((listFilesByCourse as jest.Mock).mock.calls.length).toBe(fileFetches);
  expect((listNotesByCourse as jest.Mock).mock.calls.length).toBe(noteFetches);
});
