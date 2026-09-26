import renderer, { act } from 'react-test-renderer';
import NoteModal from '../../../../app/note-edit';
import { Note } from '@/db/schema';
import { BrutCard } from '@/ui/BrutCard';
import { NoteList } from '../components/NoteList';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

jest.mock('../queries', () => ({
  listNotesByCourse: jest.fn(),
  getNoteById: jest.fn(),
  insertNote: jest.fn(),
  updateNote: jest.fn(),
  deleteNote: jest.fn(),
}));

const expoRouter = jest.requireMock('expo-router') as {
  router: { push: jest.Mock; back: jest.Mock };
  useLocalSearchParams: jest.Mock;
};

const queries = jest.requireMock('../queries') as {
  getNoteById: jest.Mock;
  insertNote: jest.Mock;
  updateNote: jest.Mock;
  deleteNote: jest.Mock;
};

const texts = (node: unknown, out: string[] = []): string[] => {
  if (Array.isArray(node)) {
    node.forEach((child) => texts(child, out));
    return out;
  }
  if (!node || typeof node !== 'object') return out;
  const { type, children } = node as { type?: unknown; children?: unknown };
  if (type === 'Text') {
    const kids = Array.isArray(children) ? children : [children];
    kids.forEach((k) => {
      if (typeof k === 'string') out.push(k);
    });
  }
  texts(children, out);
  return out;
};

const render = async (node: React.ReactElement): Promise<{
  tree: renderer.ReactTestRenderer;
  found: string[];
  json: string;
}> => {
  let tree: renderer.ReactTestRenderer | undefined;
  await act(async () => {
    tree = renderer.create(node);
  });
  await act(async () => {});
  const found = texts(tree?.toJSON());
  const json = JSON.stringify(tree?.toJSON());
  return { tree: tree!, found, json };
};

const note = (over: Partial<Note> = {}): Note =>
  ({
    id: 'n1', courseId: 'c1', kind: 'teacher_said', body: 'Exam is Friday',
    description: null, updatedAt: new Date(), ...over,
  }) as Note;

const hostsByLabel = (tree: renderer.ReactTestRenderer, label: string) =>
  tree.root.findAll((n) => typeof n.type === 'string' && n.props.accessibilityLabel === label);

const hostByLabel = (tree: renderer.ReactTestRenderer, label: string) => {
  const [node] = hostsByLabel(tree, label);
  if (node === undefined) throw new Error(`no host node labelled "${label}"`);
  return node;
};

// The composite Pressable (not the host View) carries the user's onPress.
const saveButton = (tree: renderer.ReactTestRenderer) => {
  const [node] = tree.root.findAll(
    (n) => typeof n.type === 'function' && n.props.accessibilityLabel === 'save note',
  );
  if (node === undefined) throw new Error('no SAVE control');
  return node;
};

beforeEach(() => {
  jest.clearAllMocks();
  expoRouter.useLocalSearchParams.mockReturnValue({ id: 'new', courseId: 'c1' });
  queries.getNoteById.mockResolvedValue(null);
  queries.insertNote.mockResolvedValue(note());
  queries.updateNote.mockResolvedValue(note());
  queries.deleteNote.mockResolvedValue(undefined);
});

describe('NoteList', () => {
  it('row renders the SAID stamp, body and description line when set', async () => {
    const { found } = await render(
      <NoteList notes={[note({ description: 'room 4B' })]} courseId="c1" />,
    );
    expect(found).toEqual(['SAID', 'Exam is Friday', 'room 4B']);
  });

  it('row stamps TIP for exam tips and omits the description line when unset', async () => {
    const { found } = await render(
      <NoteList
        notes={[note({ id: 'n2', kind: 'exam_tip', body: 'revise ch.3 first', description: null })]}
        courseId="c1"
      />,
    );
    expect(found).toEqual(['TIP', 'revise ch.3 first']);
  });

  it('row tap pushes the note-edit modal with the note id and courseId', async () => {
    const { tree } = await render(<NoteList notes={[note()]} courseId="c1" />);
    await act(async () => {
      tree.root.findByType(BrutCard).props.onPress();
    });
    expect(expoRouter.router.push).toHaveBeenCalledWith({
      pathname: '/note-edit',
      params: { id: 'n1', courseId: 'c1' },
    });
  });
});

describe('note-edit modal', () => {
  it('disables SAVE while the body is empty and enables it once typed', async () => {
    const { tree } = await render(<NoteModal />);
    expect(hostByLabel(tree, 'save note').props.accessibilityState).toEqual({ disabled: true });
    expect(hostsByLabel(tree, 'delete note')).toHaveLength(0);

    await act(async () => {
      hostByLabel(tree, 'note body').props.onChangeText('Exam moved to Friday');
    });
    expect(hostByLabel(tree, 'save note').props.accessibilityState?.disabled).toBe(false);
  });

  it('guards the save path: pressing SAVE with an empty body persists nothing', async () => {
    const { tree, found } = await render(<NoteModal />);
    await act(async () => {
      saveButton(tree).props.onPress();
    });
    const after = texts(tree.toJSON());
    expect(after).toContain('Note is required');
    expect(queries.insertNote).not.toHaveBeenCalled();
    expect(expoRouter.router.back).not.toHaveBeenCalled();
    expect(found).toContain('SAVE');
  });

  it('create flow validates, inserts through the store and closes', async () => {
    const { tree } = await render(<NoteModal />);
    await act(async () => {
      hostByLabel(tree, 'note body').props.onChangeText('  Revise chapter 3  ');
      hostByLabel(tree, 'note details').props.onChangeText('from unit test');
    });
    await act(async () => {
      saveButton(tree).props.onPress();
    });
    expect(queries.insertNote).toHaveBeenCalledWith({
      courseId: 'c1',
      kind: 'teacher_said',
      body: 'Revise chapter 3',
      description: 'from unit test',
    });
    expect(expoRouter.router.back).toHaveBeenCalledTimes(1);
  });

  it('hydrates an existing note by id and shows DELETE', async () => {
    expoRouter.useLocalSearchParams.mockReturnValue({ id: 'n7', courseId: 'c1' });
    queries.getNoteById.mockResolvedValue(
      note({ id: 'n7', body: 'Quiz on Monday', description: 'chapters 1–2' }),
    );
    const { tree, found } = await render(<NoteModal />);
    expect(queries.getNoteById).toHaveBeenCalledWith('n7');
    expect(hostByLabel(tree, 'note body').props.value).toBe('Quiz on Monday');
    expect(hostByLabel(tree, 'note details').props.value).toBe('chapters 1–2');
    expect(found).toContain('DELETE');
    expect(found).toContain('EDIT NOTE');
  });
});
