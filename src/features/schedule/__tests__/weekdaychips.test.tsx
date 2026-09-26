import renderer from 'react-test-renderer';
import { DEFAULT_SETTINGS } from '@/features/settings/logic';
import { useSettingsStore } from '@/features/settings/store';
import { WeekdayChips } from '../components/WeekdayChips';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/features/reminders/refresh', () => ({
  refreshReminders: jest.fn().mockResolvedValue(undefined),
}));

const Haptics = jest.requireMock('expo-haptics') as { selectionAsync: jest.Mock };

function chipWeekdays(tree: renderer.ReactTestRenderer): number[] {
  return tree.root
    .findAll((n) => typeof n.props?.onPress === 'function')
    .map((n) => Number(String(n.props.accessibilityLabel).replace('weekday ', '')));
}

beforeEach(() => {
  renderer.act(() => { useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS }, hydrated: true }); });
});

// RN exports Pressable under React.memo, so instance.type is the inner
// function — match pressables by their onPress prop instead of by type.
it('weekday chip press fires the selection haptic and reports the weekday', () => {
  const onChange = jest.fn();
  let tree: renderer.ReactTestRenderer | undefined;
  renderer.act(() => {
    tree = renderer.create(<WeekdayChips value={1} onChange={onChange} />);
  });
  const chips = tree!.root.findAll((n) => typeof n.props?.onPress === 'function');
  expect(chips).toHaveLength(7);
  // Default week_start is monday, so the row leads with Monday.
  expect(chipWeekdays(tree!)).toEqual([1, 2, 3, 4, 5, 6, 0]);
  renderer.act(() => { chips[0]!.props.onPress(); });
  expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  expect(onChange).toHaveBeenCalledWith(1);
  expect(onChange).not.toHaveBeenCalledWith(0);
});

it('orders the row sunday-first when week_start is sunday', () => {
  renderer.act(() => { useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS, week_start: 'sunday' } }); });
  let tree: renderer.ReactTestRenderer | undefined;
  renderer.act(() => {
    tree = renderer.create(<WeekdayChips value={0} onChange={jest.fn()} />);
  });
  expect(chipWeekdays(tree!)).toEqual([0, 1, 2, 3, 4, 5, 6]);
});
