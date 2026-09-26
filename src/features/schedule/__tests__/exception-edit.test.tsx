import { Alert } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import ExceptionEditScreen from '../../../../app/exception-edit';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

jest.mock('@/features/schedule/store', () => ({
  useSchedule: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
}));

const expoRouter = jest.requireMock('expo-router') as {
  router: { push: jest.Mock; back: jest.Mock };
  useLocalSearchParams: jest.Mock;
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
    tree = renderer.create(<ExceptionEditScreen />);
  });
  await act(async () => {});
  return { tree: tree!, found: texts(tree?.toJSON()) };
};

const hostsByLabel = (tree: renderer.ReactTestRenderer, label: string) =>
  tree.root.findAll((n) => typeof n.type === 'string' && n.props.accessibilityLabel === label);

const hostByLabel = (tree: renderer.ReactTestRenderer, label: string) => {
  const [node] = hostsByLabel(tree, label);
  if (node === undefined) throw new Error(`no host node labelled "${label}"`);
  return node;
};

const saveButton = (tree: renderer.ReactTestRenderer) => {
  const [node] = tree.root.findAll(
    (n) => typeof n.type === 'function' && n.props.accessibilityLabel === 'save exception',
  );
  if (node === undefined) throw new Error('no SAVE control');
  return node;
};

const chipByText = (tree: renderer.ReactTestRenderer, text: string) => {
  const [labelNode] = tree.root.findAllByProps({ children: text });
  if (labelNode === undefined) throw new Error(`no label "${text}"`);
  let chip: renderer.ReactTestInstance | null = labelNode;
  while (chip !== null && typeof chip.props?.onPress !== 'function') chip = chip.parent;
  if (chip === null) throw new Error(`no pressable labelled "${text}"`);
  return chip;
};

let saveException: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  expoRouter.useLocalSearchParams.mockReturnValue({ courseId: 'c1' });
  saveException = jest.fn().mockResolvedValue({ id: 'e1' });
  scheduleStore.useSchedule.mockReturnValue({
    patterns: [],
    exceptions: [],
    loaded: true,
    refresh: jest.fn(),
    saveException,
    removeException: jest.fn(),
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('disables SAVE until the date is a valid YYYY-MM-DD', async () => {
  const { tree } = await render();
  expect(hostByLabel(tree, 'save exception').props.accessibilityState).toEqual({ disabled: true });

  await act(async () => {
    hostByLabel(tree, 'exception date').props.onChangeText('2026-9-28');
  });
  expect(hostByLabel(tree, 'save exception').props.accessibilityState?.disabled).toBe(true);

  await act(async () => {
    hostByLabel(tree, 'exception date').props.onChangeText('2026-09-28');
  });
  expect(hostByLabel(tree, 'save exception').props.accessibilityState?.disabled).toBe(false);
});

it('saves a cancelled exception with the exact draft and closes', async () => {
  const { tree } = await render();
  await act(async () => {
    hostByLabel(tree, 'exception date').props.onChangeText('2026-10-02');
  });
  await act(async () => {
    saveButton(tree).props.onPress();
  });
  expect(saveException).toHaveBeenCalledWith({
    courseId: 'c1',
    date: '2026-10-02',
    kind: 'cancelled',
  });
  expect(expoRouter.router.back).toHaveBeenCalledTimes(1);
});

it('maps the EXTRA chip to the one_off kind on save', async () => {
  const { tree } = await render();
  await act(async () => {
    hostByLabel(tree, 'exception date').props.onChangeText('2026-10-03');
    chipByText(tree, 'EXTRA').props.onPress();
  });
  await act(async () => {
    saveButton(tree).props.onPress();
  });
  expect(saveException).toHaveBeenCalledWith({
    courseId: 'c1',
    date: '2026-10-03',
    kind: 'one_off',
  });
  expect(expoRouter.router.back).toHaveBeenCalledTimes(1);
});

it('guards the save path: pressing SAVE with a malformed date persists nothing', async () => {
  const { tree } = await render();
  await act(async () => {
    saveButton(tree).props.onPress();
  });
  const after = texts(tree.toJSON());
  expect(after).toContain('Date must be YYYY-MM-DD');
  expect(saveException).not.toHaveBeenCalled();
  expect(expoRouter.router.back).not.toHaveBeenCalled();
});

it('alerts on a duplicate course/date and stays on the modal', async () => {
  saveException.mockRejectedValue(
    Object.assign(
      new Error('UNIQUE constraint failed: schedule_exceptions.course_id, schedule_exceptions.date'),
      { code: 2067 },
    ),
  );
  const { tree } = await render();
  await act(async () => {
    hostByLabel(tree, 'exception date').props.onChangeText('2026-10-02');
  });
  await act(async () => {
    saveButton(tree).props.onPress();
  });
  expect(Alert.alert).toHaveBeenCalledWith(
    'Duplicate date',
    'An exception already exists for that date.',
    [{ text: 'OK' }],
  );
  expect(expoRouter.router.back).not.toHaveBeenCalled();
  expect(hostByLabel(tree, 'save exception').props.accessibilityState?.disabled).toBe(false);
});

it('shows an empty state when courseId is missing', async () => {
  expoRouter.useLocalSearchParams.mockReturnValue({});
  const { found } = await render();
  expect(found).toContain('missing course id');
  expect(saveException).not.toHaveBeenCalled();
});
