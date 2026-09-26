import renderer from 'react-test-renderer';
import { WeekdayChips } from '../components/WeekdayChips';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
}));

const Haptics = jest.requireMock('expo-haptics') as { selectionAsync: jest.Mock };

// RN exports Pressable under React.memo, so instance.type is the inner
// function — match pressables by their onPress prop instead of by type.
it('weekday chip press fires the selection haptic and reports the weekday', () => {
  const onChange = jest.fn();
  let tree: renderer.ReactTestRenderer | undefined;
  renderer.act(() => {
    tree = renderer.create(<WeekdayChips value={0} onChange={onChange} />);
  });
  const chips = tree!.root.findAll((n) => typeof n.props?.onPress === 'function');
  expect(chips).toHaveLength(7);
  renderer.act(() => { chips[1]!.props.onPress(); });
  expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  expect(onChange).toHaveBeenCalledWith(1);
  expect(onChange).not.toHaveBeenCalledWith(0);
});
