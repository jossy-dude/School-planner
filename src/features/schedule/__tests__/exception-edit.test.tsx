import { Alert } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import { Pattern } from '@/db/schema';
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

const saveDisabled = (tree: renderer.ReactTestRenderer) =>
  hostByLabel(tree, 'save exception').props.accessibilityState?.disabled === true;

const chipByText = (tree: renderer.ReactTestRenderer, text: string) => {
  const [labelNode] = tree.root.findAllByProps({ children: text });
  if (labelNode === undefined) throw new Error(`no label "${text}"`);
  let chip: renderer.ReactTestInstance | null = labelNode;
  while (chip !== null && typeof chip.props?.onPress !== 'function') chip = chip.parent;
  if (chip === null) throw new Error(`no pressable labelled "${text}"`);
  return chip;
};

const press = async (node: renderer.ReactTestInstance, ...args: unknown[]) => {
  await act(async () => {
    (node.props.onPress as (...a: unknown[]) => void)(...args);
  });
};

const setDate = async (tree: renderer.ReactTestRenderer, value: string) => {
  await act(async () => {
    hostByLabel(tree, 'exception date').props.onChangeText(value);
  });
};

const setTimes = async (tree: renderer.ReactTestRenderer, start: string, end: string) => {
  const [sh = '', sm = ''] = start.split(':');
  const [eh = '', em = ''] = end.split(':');
  await act(async () => { hostByLabel(tree, 'start hour').props.onChangeText(sh); });
  await act(async () => { hostByLabel(tree, 'start minute').props.onChangeText(sm); });
  await act(async () => { hostByLabel(tree, 'end hour').props.onChangeText(eh); });
  await act(async () => { hostByLabel(tree, 'end minute').props.onChangeText(em); });
};

const pattern = (over: Partial<Pattern> = {}): Pattern =>
  ({
    id: 'p1',
    courseId: 'c1',
    weekday: 1,
    startTime: '08:00',
    endTime: '09:30',
    location: null,
    validFrom: null,
    validTo: null,
    updatedAt: new Date(),
    ...over,
  }) as Pattern;

let saveException: jest.Mock;

const givenStore = (over: Record<string, unknown> = {}) => {
  scheduleStore.useSchedule.mockReturnValue({
    patterns: [pattern()],
    exceptions: [],
    loaded: true,
    refresh: jest.fn(),
    saveException,
    removeException: jest.fn(),
    ...over,
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  expoRouter.useLocalSearchParams.mockReturnValue({ courseId: 'c1' });
  saveException = jest.fn().mockResolvedValue({ id: 'e1' });
  givenStore();
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('disables SAVE until the date is a valid YYYY-MM-DD', async () => {
  const { tree } = await render();
  expect(hostByLabel(tree, 'save exception').props.accessibilityState).toEqual({ disabled: true });

  await setDate(tree, '2026-9-28');
  expect(saveDisabled(tree)).toBe(true);

  await setDate(tree, '2026-09-28');
  expect(saveDisabled(tree)).toBe(false);
});

it('auto-binds the only pattern when saving a cancellation, without showing a picker', async () => {
  const { tree } = await render();
  expect(() => chipByText(tree, 'MON 08:00–09:30')).toThrow();

  await setDate(tree, '2026-10-02');
  expect(saveDisabled(tree)).toBe(false);
  await press(saveButton(tree));

  expect(saveException).toHaveBeenCalledWith({
    courseId: 'c1',
    date: '2026-10-02',
    kind: 'cancelled',
    patternId: 'p1',
  });
  expect(expoRouter.router.back).toHaveBeenCalledTimes(1);
});

it('requires an explicit pattern choice when the course has several, and hides the picker for EXTRA', async () => {
  givenStore({
    patterns: [
      pattern(),
      pattern({ id: 'p2', startTime: '09:00', endTime: '10:30' }),
    ],
  });
  const { tree } = await render();
  await setDate(tree, '2026-10-04');
  expect(saveDisabled(tree)).toBe(true);

  await press(chipByText(tree, 'EXTRA'));
  expect(() => chipByText(tree, 'MON 09:00–10:30')).toThrow();
  expect(saveDisabled(tree)).toBe(true);

  await press(chipByText(tree, 'CANCELLED'));
  expect(() => chipByText(tree, 'MON 09:00–10:30')).not.toThrow();
  expect(saveDisabled(tree)).toBe(true);

  await press(chipByText(tree, 'MON 09:00–10:30'));
  expect(saveDisabled(tree)).toBe(false);
  await press(saveButton(tree));
  expect(saveException).toHaveBeenCalledWith({
    courseId: 'c1',
    date: '2026-10-04',
    kind: 'cancelled',
    patternId: 'p2',
  });
  expect(expoRouter.router.back).toHaveBeenCalledTimes(1);
});

it('hides CANCELLED when the course has no patterns and still saves an EXTRA', async () => {
  givenStore({ patterns: [] });
  const { tree, found } = await render();
  expect(found).toContain('no class times to cancel yet');
  expect(() => chipByText(tree, 'CANCELLED')).toThrow();

  await setDate(tree, '2026-10-07');
  expect(saveDisabled(tree)).toBe(true);
  await setTimes(tree, '10:00', '11:00');
  expect(saveDisabled(tree)).toBe(false);
  await press(saveButton(tree));

  expect(saveException).toHaveBeenCalledWith({
    courseId: 'c1',
    date: '2026-10-07',
    kind: 'one_off',
    startTime: '10:00',
    endTime: '11:00',
  });
  expect(expoRouter.router.back).toHaveBeenCalledTimes(1);
});

it('maps the EXTRA chip to one_off and gates SAVE on both times', async () => {
  const { tree } = await render();
  await press(chipByText(tree, 'EXTRA'));
  await setDate(tree, '2026-10-03');
  expect(saveDisabled(tree)).toBe(true);

  await setTimes(tree, '14:00', '15:00');
  expect(saveDisabled(tree)).toBe(false);
  await press(saveButton(tree));

  expect(saveException).toHaveBeenCalledWith({
    courseId: 'c1',
    date: '2026-10-03',
    kind: 'one_off',
    startTime: '14:00',
    endTime: '15:00',
  });
  expect(expoRouter.router.back).toHaveBeenCalledTimes(1);
});

it('still gates SAVE when only one EXTRA time is filled', async () => {
  const { tree } = await render();
  await press(chipByText(tree, 'EXTRA'));
  await setDate(tree, '2026-10-08');
  await act(async () => { hostByLabel(tree, 'start hour').props.onChangeText('14'); });
  await act(async () => { hostByLabel(tree, 'start minute').props.onChangeText('00'); });
  expect(saveDisabled(tree)).toBe(true);
  await act(async () => { hostByLabel(tree, 'end hour').props.onChangeText('15'); });
  expect(saveDisabled(tree)).toBe(true);
  await act(async () => { hostByLabel(tree, 'end minute').props.onChangeText('00'); });
  expect(saveDisabled(tree)).toBe(false);
});

it('guards the save path: pressing SAVE with a malformed date persists nothing', async () => {
  const { tree } = await render();
  await press(saveButton(tree));
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
  await setDate(tree, '2026-10-02');
  await press(saveButton(tree));
  expect(Alert.alert).toHaveBeenCalledWith(
    'Duplicate date',
    'An exception already exists for that date.',
    [{ text: 'OK' }],
  );
  expect(expoRouter.router.back).not.toHaveBeenCalled();
  expect(saveDisabled(tree)).toBe(false);
});

it('shows an empty state when courseId is missing', async () => {
  expoRouter.useLocalSearchParams.mockReturnValue({});
  const { found } = await render();
  expect(found).toContain('missing course id');
  expect(saveException).not.toHaveBeenCalled();
});
