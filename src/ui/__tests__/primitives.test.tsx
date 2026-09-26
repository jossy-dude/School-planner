import renderer from 'react-test-renderer';
import { FilterChip, SegmentedChips, TMinusChip, Stamp } from '../primitives';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
}));

const Haptics = jest.requireMock('expo-haptics') as { selectionAsync: jest.Mock };

beforeEach(() => {
  Haptics.selectionAsync.mockClear();
});

const render = (n: React.ReactElement): renderer.ReactTestRenderer => {
  let tree: renderer.ReactTestRenderer | undefined;
  renderer.act(() => {
    tree = renderer.create(n);
  });
  return tree!;
};

const texts = (n: React.ReactElement): string[] => {
  const tree = render(n);
  const found: string[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!node || typeof node !== 'object') return;
    const { type, children } = node as { type?: unknown; children?: unknown };
    if (type === 'Text') {
      const kids = Array.isArray(children) ? children : [children];
      kids.forEach((k) => {
        if (typeof k === 'string') found.push(k);
      });
    }
    walk(children);
  };
  walk(tree.toJSON());
  return found;
};

it('chip renders its count pill text', () => {
  expect(texts(<FilterChip label="CLASSES" count={5} active onPress={() => {}} />))
    .toContain('5');
});
it('chip without count renders no count text', () => {
  expect(texts(<FilterChip label="CLASSES" active onPress={() => {}} />))
    .not.toContain('5');
});
it('t-minus uses lcd text', () => {
  expect(texts(<TMinusChip text="T-6D" />)).toEqual(['T-6D']);
});
it('stamp renders text', () => {
  expect(texts(<Stamp text="DONE" />)).toEqual(['DONE']);
});
// RN exports Pressable under React.memo, so instance.type is the inner
// function — match pressables by their onPress prop instead of by type.
// The component root also carries an onPress prop (the caller's handler),
// so exclude it: only Pressable instances count.
const pressables = (tree: renderer.ReactTestRenderer) =>
  tree.root.findAll((n) => n !== tree.root && typeof n.props?.onPress === 'function');

it('FilterChip press fires the selection haptic, then the handler', () => {
  const onPress = jest.fn();
  const tree = render(<FilterChip label="CLASSES" active onPress={onPress} />);
  const [chip] = pressables(tree);
  renderer.act(() => { chip!.props.onPress(); });
  expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  expect(onPress).toHaveBeenCalledTimes(1);
});
it('SegmentedChips press fires the selection haptic, then the handler', () => {
  const onChange = jest.fn();
  const tree = render(<SegmentedChips options={['SUN', 'MON']} value="SUN" onChange={onChange} />);
  const options = pressables(tree);
  expect(options).toHaveLength(2);
  renderer.act(() => { options[1]!.props.onPress(); });
  expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  expect(onChange).toHaveBeenCalledWith('MON');
});
