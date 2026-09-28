import renderer, { act } from 'react-test-renderer';
import { CelebrationOverlay } from '../components/CelebrationOverlay';
import { Mascot } from '../components/Mascot';

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

const render = async (node: React.ReactElement): Promise<{ found: string[]; json: string; tree: renderer.ReactTestRenderer }> => {
  let tree: renderer.ReactTestRenderer | undefined;
  await act(async () => {
    tree = renderer.create(node);
  });
  const found = texts(tree?.toJSON());
  const json = JSON.stringify(tree?.toJSON());
  return { found, json, tree: tree! };
};

it('Mascot renders a 64px body, beak, and both eyes frames', async () => {
  const { json, tree } = await render(<Mascot />);
  expect(json).toContain('"width":64');
  expect(json).toContain('"type":"RNSVGPath"'); // body + beak + closed-eyes path
  expect(json).toContain('"type":"RNSVGCircle"'); // open eyes
  expect(json).toContain('M32 7 C47 7'); // body path
  expect(json).toContain('M26 34 L38 34'); // beak path
  await act(async () => { tree.unmount(); });
});

it('overlay shows the DONE stamp, duration, and mascot', async () => {
  const { found, tree } = await render(<CelebrationOverlay minutes={25} onDismiss={jest.fn()} />);
  expect(found).toContain('DONE');
  expect(found).toContain('25M');
  expect(tree.root.findAllByProps({ accessibilityLabel: 'study mascot' }).length).toBeGreaterThan(0);
  await act(async () => { tree.unmount(); });
});

it('tap anywhere dismisses the overlay', async () => {
  const onDismiss = jest.fn();
  const { tree } = await render(<CelebrationOverlay minutes={45} onDismiss={onDismiss} />);
  const [dismiss] = tree.root.findAllByProps({ accessibilityLabel: 'dismiss celebration' });
  expect(dismiss).toBeDefined();
  await act(async () => { dismiss!.props.onPress(); });
  expect(onDismiss).toHaveBeenCalledTimes(1);
  await act(async () => { tree.unmount(); });
});

it('schedules a 4s auto-dismiss that is cancelled on unmount', async () => {
  const timeoutSpy = jest.spyOn(global, 'setTimeout');
  const clearSpy = jest.spyOn(global, 'clearTimeout');
  const onDismiss = jest.fn();
  let tree: renderer.ReactTestRenderer | undefined;
  await act(async () => {
    tree = renderer.create(<CelebrationOverlay minutes={60} onDismiss={onDismiss} />);
  });
  expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 4000);
  const idx = timeoutSpy.mock.calls.findIndex((call) => call[1] === 4000);
  expect(idx).toBeGreaterThanOrEqual(0);
  const timerId = timeoutSpy.mock.results[idx]!.value;
  (timeoutSpy.mock.calls[idx]![0] as () => void)();
  expect(onDismiss).toHaveBeenCalledTimes(1);
  await act(async () => { tree!.unmount(); });
  expect(clearSpy).toHaveBeenCalledWith(timerId);
  timeoutSpy.mockRestore();
  clearSpy.mockRestore();
});
