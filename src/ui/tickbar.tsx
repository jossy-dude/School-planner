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

function Tick({ index, progress, width, minHeight, growHeight }: {
  index: number; progress: number; width: number; minHeight: number; growHeight: number;
}) {
  // progress re-renders via prop; CSS-transition-free explicit animation keeps stagger exact
  const p = useSharedValue(0);
  const filled = index / COUNT < progress;
  const target = filled ? 1 : 0;
  useEffect(() => {
    p.value = withDelay(index * 6, withTiming(target, { duration: filled ? 75 : 200 }));
  }, [p, target, filled, index]);
  const style = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 1], [colors.ink15, colors.ink]),
    height: minHeight + p.value * growHeight,
  }));
  return <Animated.View style={[{ width, borderRadius: width / 2 }, style]} />;
}

const SIZES = {
  sm: { barHeight: 14, width: 2, gap: 2, minHeight: 4, growHeight: 8 },
  lg: { barHeight: 40, width: 6, gap: 3, minHeight: 10, growHeight: 30 },
} as const;

export const TickBar = memo(function TickBar({ progress, size = 'sm' }: {
  progress: number;
  /** 'lg' is a noticeably bigger bar for a hero/focal placement (e.g. the Today card). */
  size?: 'sm' | 'lg';
}) {
  const s = SIZES[size];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: s.gap, height: s.barHeight }}>
      {Array.from({ length: COUNT }, (_, i) => (
        <Tick key={i} index={i} progress={progress} width={s.width} minHeight={s.minHeight} growHeight={s.growHeight} />
      ))}
    </View>
  );
});
