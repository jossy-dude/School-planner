import renderer from 'react-test-renderer';
import { TickBar } from '../tickbar';

it('renders the small (default) size without crashing', () => {
  let t: renderer.ReactTestRenderer | undefined;
  renderer.act(() => { t = renderer.create(<TickBar progress={0.5} />); });
  expect(t?.toJSON()).toBeTruthy();
});

it('renders the large size with a taller row', () => {
  let t: renderer.ReactTestRenderer | undefined;
  renderer.act(() => { t = renderer.create(<TickBar progress={0.5} size="lg" />); });
  expect(JSON.stringify(t?.toJSON())).toContain('"height":40');
});
