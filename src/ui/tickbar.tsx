import { memo, useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '@/ui/tokens';

const COUNT = 40;

function Tick({ index, progress }: { index: number; progress: number }) {
  // progress re-renders via prop; CSS-transition-free explicit animation keeps stagger exact
  const p = useSharedValue(0);
  const filled = index / COUNT < progress;
  const target = filled ? 1 : 0;
  useEffect(() => {
    p.value = withDelay(index * 6, withTiming(target, { duration: filled ? 75 : 200 }));
  }, [p, target, filled, index]);
  const style = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 1], [colors.ink15, colors.ink]),
    height: 4 + p.value * 8,
  }));
  return <Animated.View style={[{ width: 2, borderRadius: 1 }, style]} />;
}

export const TickBar = memo(function TickBar({ progress }: { progress: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 14 }}>
      {Array.from({ length: COUNT }, (_, i) => <Tick key={i} index={i} progress={progress} />)}
    </View>
  );
});
