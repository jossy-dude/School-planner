import renderer from 'react-test-renderer';
import { BootErrorScreen } from '../BootErrorScreen';

it('renders a minimal migration-failure message with no stack trace', () => {
  let tree: renderer.ReactTestRenderer | undefined;
  renderer.act(() => {
    tree = renderer.create(<BootErrorScreen />);
  });
  const strings = [
    ...new Set(
      tree!.root
        .findAll((n) => typeof n.props?.children === 'string')
        .map((n) => n.props.children as string),
    ),
  ];
  expect(strings).toEqual(['database failed to migrate — restart the app']);
});
