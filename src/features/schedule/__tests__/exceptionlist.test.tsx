import { Alert } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import { ScheduleException } from '@/db/schema';
import { ExceptionList } from '../components/ExceptionList';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

jest.mock('@/features/schedule/store', () => ({
  useSchedule: jest.fn(),
}));

const expoRouter = jest.requireMock('expo-router') as {
  router: { push: jest.Mock; back: jest.Mock };
};

const scheduleStore = jest.requireMock('@/features/schedule/store') as {
  useSchedule: jest.Mock;
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

const render = async (): Promise<{
  tree: renderer.ReactTestRenderer;
  found: string[];
}> => {
  let tree: renderer.ReactTestRenderer | undefined;
  await act(async () => {
    tree = renderer.create(<ExceptionList courseId="c1" />);
  });
  await act(async () => {});
  return { tree: tree!, found: texts(tree?.toJSON()) };
};

const exception = (over: Partial<ScheduleException> = {}): ScheduleException =>
  ({
    id: 'e1',
    courseId: 'c1',
    patternId: null,
    date: '2026-09-28',
    kind: 'cancelled',
    startTime: null,
    endTime: null,
    updatedAt: new Date(),
    ...over,
  }) as ScheduleException;

let removeException: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  removeException = jest.fn().mockResolvedValue(undefined);
  scheduleStore.useSchedule.mockReturnValue({
    exceptions: [exception()],
    removeException,
  });
});

it('renders the EXCEPTIONS header and rows, and the + opens the create modal', async () => {
  const { tree, found } = await render();
  expect(scheduleStore.useSchedule).toHaveBeenCalledWith('c1');
  expect(found).toContain('EXCEPTIONS');
  expect(found).toContain('2026-09-28');
  expect(found).toContain('CANCELLED');

  const [add] = tree.root.findAll(
    (n) => typeof n.type === 'function' && n.props.accessibilityLabel === 'add exception',
  );
  if (add === undefined) throw new Error('no add-exception control');
  act(() => {
    add.props.onPress();
  });
  expect(expoRouter.router.push).toHaveBeenCalledWith({
    pathname: '/exception-edit',
    params: { courseId: 'c1' },
  });
});

it('shows a muted none-yet hint when the course has no exceptions', async () => {
  scheduleStore.useSchedule.mockReturnValue({ exceptions: [], removeException });
  const { found } = await render();
  expect(found).toContain('EXCEPTIONS');
  expect(found).toContain('none yet');
  expect(Alert.alert).not.toHaveBeenCalled();
});

it('long-pressing a row asks for confirmation, then removes the exception', async () => {
  const { tree } = await render();
  const rows = tree.root.findAll((n) => typeof n.props?.onLongPress === 'function');
  expect(rows.length).toBeGreaterThanOrEqual(1);

  await act(async () => {
    rows[0]!.props.onLongPress();
  });
  expect(Alert.alert).toHaveBeenCalledTimes(1);
  expect(removeException).not.toHaveBeenCalled();

  const buttons = (Alert.alert as jest.Mock).mock.calls[0][2] as {
    text: string;
    onPress?: () => void;
  }[];
  await act(async () => {
    buttons.find((b) => b.text === 'Delete')?.onPress?.();
  });
  expect(removeException).toHaveBeenCalledWith('e1');
});

it('tapping a row is a no-op in create-only mode', async () => {
  const { tree } = await render();
  const rows = tree.root.findAll((n) => typeof n.props?.onLongPress === 'function');
  expect(rows[0]!.props.onPress).toBeUndefined();
});
