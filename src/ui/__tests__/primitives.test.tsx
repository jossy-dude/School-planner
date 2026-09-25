import renderer from 'react-test-renderer';
import { FilterChip, TMinusChip, Stamp } from '../primitives';

const json = (n: React.ReactElement) => {
  let tree: renderer.ReactTestRenderer | undefined;
  renderer.act(() => {
    tree = renderer.create(n);
  });
  return JSON.stringify(tree?.toJSON());
};

it('chip shows count', () => {
  expect(json(<FilterChip label="CLASSES" count={5} active onPress={() => {}} />)).toContain('5');
});
it('t-minus uses lcd text', () => {
  expect(json(<TMinusChip text="T-6D" />)).toContain('T-6D');
});
it('stamp renders text', () => {
  expect(json(<Stamp text="DONE" />)).toContain('DONE');
});
