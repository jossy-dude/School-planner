import { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { colors } from '@/ui/tokens';

// Body + beak stay painted; the two eyes frames cross-fade on a 3s blink cycle
// (100ms close → 100ms open), driven by one shared value on tickbar.tsx's
// useSharedValue + withTiming-in-effect pattern (no withRepeat: it outlives
// unmount and leaves jest with an open handle).
const BODY = 'M32 7 C47 7 57 18 57 33 C57 48 46 57 32 57 C18 57 7 48 7 33 C7 18 17 7 32 7 Z';
const BEAK = 'M26 34 L38 34 L32 43 Z';
const EYES_CLOSED = 'M21 28 L27 28 M37 28 L43 28';

export function Mascot({ size = 64 }: { size?: number }) {
  const open = useSharedValue(1);

  useEffect(() => {
    const id = setInterval(() => {
      open.value = withSequence(withTiming(0, { duration: 100 }), withTiming(1, { duration: 100 }));
    }, 3000);
    return () => clearInterval(id);
  }, [open]);

  const openStyle = useAnimatedStyle(() => ({ opacity: open.value }));
  const closedStyle = useAnimatedStyle(() => ({ opacity: 1 - open.value }));

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityRole="image"
      accessibilityLabel="study mascot"
    >
      <Svg width={size} height={size} viewBox="0 0 64 64" style={{ position: 'absolute' }}>
        <Path d={BODY} fill={colors.ink} />
        <Path d={BEAK} fill={colors.danger} />
      </Svg>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, openStyle]}>
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Circle cx={24} cy={28} r={3.5} fill={colors.paper} />
          <Circle cx={40} cy={28} r={3.5} fill={colors.paper} />
        </Svg>
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, closedStyle]}>
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Path
            d={EYES_CLOSED}
            stroke={colors.paper}
            strokeWidth={3}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}
