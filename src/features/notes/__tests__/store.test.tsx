import renderer, { act } from 'react-test-renderer';
import { Note } from '@/db/schema';
import { NoteDraft } from '../logic';
import { useNotes, useNotesStore } from '../store';

jest.mock('../queries', () => ({
  listNotesByCourse: jest.fn(),
  getNoteById: jest.fn(),
  insertNote: jest.fn(),
  updateNote: jest.fn(),
  deleteNote: jest.fn(),
}));

const queries = jest.requireMock('../queries') as {
  listNotesByCourse: jest.Mock;
  insertNote: jest.Mock;
  updateNote: jest.Mock;
  deleteNote: jest.Mock;
};

const said = {
  id: 'n1', courseId: 'c1', kind: 'teacher_said', body: 'exam Friday',
  description: null, updatedAt: new Date(),
} as Note;
const tip = {
  id: 'n2', courseId: 'c1', kind: 'exam_tip', body: 'revise ch.3',
  description: 'from the unit test', updatedAt: new Date(),
} as Note;

beforeEach(() => {
  jest.clearAllMocks();
  useNotesStore.setState({ courseId: null, notes: [], loaded: false });
  queries.listNotesByCourse.mockResolvedValue([said]);
  queries.insertNote.mockResolvedValue(tip);
  queries.updateNote.mockResolvedValue(tip);
  queries.deleteNote.mockResolvedValue(undefined);
});

it('refresh loads the course notes and marks loaded', async () => {
  await useNotesStore.getState().refresh('c1');
  const s = useNotesStore.getState();
  expect(s.courseId).toBe('c1');
  expect(s.notes).toEqual([said]);
  expect(s.loaded).toBe(true);
  expect(queries.listNotesByCourse).toHaveBeenCalledWith('c1');
});

it('create inserts then funnels one refresh', async () => {
  const draft: NoteDraft = { courseId: 'c1', kind: 'exam_tip', body: 'revise ch.3' };
  const created = await useNotesStore.getState().create(draft);
  expect(queries.insertNote).toHaveBeenCalledWith(draft);
  expect(created).toEqual(tip);
  expect(queries.listNotesByCourse).toHaveBeenCalledTimes(1);
  expect(useNotesStore.getState().notes).toEqual([said]);
});

it('update and remove both funnel one refresh', async () => {
  const s = () => useNotesStore.getState();
  await s().update('n1', { body: 'exam Thursday' }, 'c1');
  expect(queries.updateNote).toHaveBeenCalledWith('n1', { body: 'exam Thursday' });
  expect(queries.listNotesByCourse).toHaveBeenCalledTimes(1);

  await s().remove('n1', 'c1');
  expect(queries.deleteNote).toHaveBeenCalledWith('n1');
  expect(queries.listNotesByCourse).toHaveBeenCalledTimes(2);
});

it('useNotes binds courseId into create/update/remove', async () => {
  useNotesStore.setState({ courseId: 'c1', notes: [said], loaded: true });
  let out: ReturnType<typeof useNotes> | null = null;
  let tree: renderer.ReactTestRenderer | null = null;
  function Probe() {
    out = useNotes('c1');
    return null;
  }
  await act(async () => { tree = renderer.create(<Probe />); });
  await act(async () => {
    await out!.create({ kind: 'teacher_said', body: 'pop quiz tuesday' });
    await out!.update('n1', { description: 'unit 4' });
    await out!.remove('n1');
  });
  expect(queries.insertNote).toHaveBeenCalledWith(
    expect.objectContaining({ courseId: 'c1', kind: 'teacher_said', body: 'pop quiz tuesday' }),
  );
  expect(queries.updateNote).toHaveBeenCalledWith('n1', { description: 'unit 4' });
  expect(queries.deleteNote).toHaveBeenCalledWith('n1');
  await act(async () => { tree?.unmount(); tree = null; });
});

it('useNotes yields empty notes for a different course', async () => {
  useNotesStore.setState({ courseId: 'c2', notes: [tip], loaded: true });
  let out: ReturnType<typeof useNotes> | null = null;
  let tree: renderer.ReactTestRenderer | null = null;
  function Probe() {
    out = useNotes('c1');
    return null;
  }
  await act(async () => { tree = renderer.create(<Probe />); });
  expect(out!.notes).toEqual([]);
  expect(out!.loaded).toBe(false);
  await act(async () => { tree?.unmount(); tree = null; });
});
