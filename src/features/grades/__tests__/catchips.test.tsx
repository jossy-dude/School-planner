import renderer, { act } from 'react-test-renderer';
import { CategoryChips } from '../components/CategoryChips';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
}));

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

const hostByLabel = (tree: renderer.ReactTestRenderer, label: string) => {
  const [node] = tree.root.findAll((n) => typeof n.type === 'string' && n.props.accessibilityLabel === label);
  if (node === undefined) throw new Error(`no host node labelled "${label}"`);
  return node;
};

const pressByLabel = async (tree: renderer.ReactTestRenderer, label: string) => {
  const [node] = tree.root.findAll(
    (n) => typeof n.type === 'function' && n.props.accessibilityLabel === label,
  );
  if (node === undefined) throw new Error(`no pressable labelled "${label}"`);
  await act(async () => {
    (node.props.onPress as () => void)();
  });
};

const render = async (onAdd: jest.Mock) => {
  let tree: renderer.ReactTestRenderer | undefined;
  await act(async () => {
    tree = renderer.create(<CategoryChips categories={[]} onAdd={onAdd} />);
  });
  return tree!;
};

it('rejects a non-numeric weight with an inline error instead of coercing it', async () => {
  const onAdd = jest.fn();
  const tree = await render(onAdd);

  await pressByLabel(tree, 'add category');
  await act(async () => { hostByLabel(tree, 'category name').props.onChangeText('HW'); });
  await act(async () => { hostByLabel(tree, 'category weight percent').props.onChangeText('abc'); });
  await pressByLabel(tree, 'confirm add category');

  expect(onAdd).not.toHaveBeenCalled();
  expect(texts(tree.toJSON())).toContain('weight must be a number');

  await act(async () => { hostByLabel(tree, 'category weight percent').props.onChangeText('40'); });
  await pressByLabel(tree, 'confirm add category');

  expect(onAdd).toHaveBeenCalledWith({ name: 'HW', weight: 40 });
  expect(texts(tree.toJSON())).not.toContain('weight must be a number');
});

it('clamps an out-of-range weight into 0..100', async () => {
  const onAdd = jest.fn();
  const tree = await render(onAdd);

  await pressByLabel(tree, 'add category');
  await act(async () => { hostByLabel(tree, 'category name').props.onChangeText('Quiz'); });
  await act(async () => { hostByLabel(tree, 'category weight percent').props.onChangeText('250'); });
  await pressByLabel(tree, 'confirm add category');

  expect(onAdd).toHaveBeenCalledWith({ name: 'Quiz', weight: 100 });
});
