import renderer from 'react-test-renderer';
import { FilterChip, TMinusChip, Stamp } from '../primitives';

const texts = (n: React.ReactElement): string[] => {
  let tree: renderer.ReactTestRenderer | undefined;
  renderer.act(() => {
    tree = renderer.create(n);
  });
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
  walk(tree?.toJSON());
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
