import renderer from 'react-test-renderer';
import { ArcGauge } from '../ArcGauge';
it('renders value label', () => {
  let t: renderer.ReactTestRenderer | undefined;
  // React 19's test renderer only flushes inside act() (environment-wide, see Task 3).
  renderer.act(() => {
    t = renderer.create(<ArcGauge value={3.5} max={4} label="GPA" />);
  });
  expect(JSON.stringify(t?.toJSON())).toContain('3.5');
});
