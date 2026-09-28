import renderer, { act } from 'react-test-renderer';
import { AttendanceButtons } from '../components/AttendanceButtons';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
}));

const Haptics = jest.requireMock('expo-haptics') as { selectionAsync: jest.Mock };

beforeEach(() => {
  jest.clearAllMocks();
});

function pressPresent(tree: renderer.ReactTestRenderer): void {
  const [button] = tree.root.findAll((n) => n.props?.accessibilityLabel === 'present');
  renderer.act(() => { button!.props.onPress(); });
}

it('fires the haptic only after the write resolves', async () => {
  let resolveWrite: () => void = () => {};
  const write = new Promise<void>((resolve) => { resolveWrite = resolve; });
  const onSelect = jest.fn(() => write);

  let tree: renderer.ReactTestRenderer | undefined;
  renderer.act(() => {
    tree = renderer.create(<AttendanceButtons value={null} onSelect={onSelect} />);
  });

  pressPresent(tree!);
  expect(onSelect).toHaveBeenCalledWith('present');
  await act(async () => {});
  // Write still in flight — no "saved" buzz yet.
  expect(Haptics.selectionAsync).not.toHaveBeenCalled();

  resolveWrite();
  await act(async () => {});
  expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
});

it('stays silent when the write fails', async () => {
  const onSelect = jest.fn(() => Promise.reject(new Error('FK constraint failed')));

  let tree: renderer.ReactTestRenderer | undefined;
  renderer.act(() => {
    tree = renderer.create(<AttendanceButtons value={null} onSelect={onSelect} />);
  });

  pressPresent(tree!);
  await act(async () => {});

  expect(Haptics.selectionAsync).not.toHaveBeenCalled();
});

it('still buzzes for a caller that marks synchronously', async () => {
  const onSelect = jest.fn();

  let tree: renderer.ReactTestRenderer | undefined;
  renderer.act(() => {
    tree = renderer.create(<AttendanceButtons value={null} onSelect={onSelect} />);
  });

  pressPresent(tree!);
  await act(async () => {});

  expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
});
