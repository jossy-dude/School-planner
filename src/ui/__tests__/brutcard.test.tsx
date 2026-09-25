import renderer from 'react-test-renderer';
import { Text } from 'react-native';
import { BrutCard } from '../BrutCard';

it('renders children inside a card', () => {
  let tree: renderer.ReactTestRenderer | undefined;
  renderer.act(() => {
    tree = renderer.create(
      <BrutCard>
        <Text>hello</Text>
      </BrutCard>,
    );
  });
  expect(JSON.stringify(tree?.toJSON())).toContain('hello');
});
