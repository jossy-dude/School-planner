import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, radius } from '@/ui/tokens';

// A from-scratch native rebuild of React Bits' web-only <Folder/> (which relies
// on CSS :hover and mouse coordinates that don't exist on a touch device): the
// same "papers fan out from behind a flap" idea, driven by a Reanimated spring
// on tap instead of hover, so it plays the same on iOS, Android and web.

interface FolderProps {
  color?: string;
  open: boolean;
  onToggle: () => void;
  /** How many of the 3 paper slots look "filled" (dims empty ones) vs the total. */
  filledCount?: number;
  size?: number;
  accessibilityLabel?: string;
}

const SPRING = { damping: 16, stiffness: 220, mass: 0.7 };

function darken(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, ((n >> 16) & 0xff) * (1 - amt));
  const g = Math.max(0, ((n >> 8) & 0xff) * (1 - amt));
  const b = Math.max(0, (n & 0xff) * (1 - amt));
  return `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
}

export function Folder({ color = colors.ink, open, onToggle, filledCount = 3, size = 1, accessibilityLabel }: FolderProps) {
  const t = useSharedValue(open ? 1 : 0);
  useEffect(() => { t.value = withSpring(open ? 1 : 0, SPRING); }, [open, t]);

  const W = 72 * size;
  const H = 56 * size;

  const liftStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -5 * t.value }] }));
  const paper1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: -14 * t.value }, { translateX: -8 * t.value }, { rotateZ: `${-10 * t.value}deg` }],
    opacity: filledCount > 0 ? 1 : 0.3,
  }));
  const paper2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: -20 * t.value }, { rotateZ: `${3 * t.value}deg` }],
    opacity: filledCount > 1 ? 1 : 0.3,
  }));
  const paper3Style = useAnimatedStyle(() => ({
    transform: [{ translateY: -15 * t.value }, { translateX: 8 * t.value }, { rotateZ: `${9 * t.value}deg` }],
    opacity: filledCount > 2 ? 1 : 0.3,
  }));
  // The flap's bottom edge is pinned (position: absolute, bottom: 0), so
  // shrinking its height folds it down toward the base — no transform-origin
  // trick needed for the hinge.
  const flapStyle = useAnimatedStyle(() => ({ height: H * 0.62 * (1 - t.value * 0.55) }));

  const back = darken(color, 0.28);

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ expanded: open }}
      hitSlop={8}
    >
      <Animated.View style={[{ width: W, height: H + 14, alignItems: 'center' }, liftStyle]}>
        <View style={{
          position: 'absolute', bottom: 4, width: W, height: H * 0.7,
          backgroundColor: back, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.ink,
        }} />
        <Animated.View style={[{
          position: 'absolute', bottom: 8, width: W * 0.62, height: H * 0.5,
          backgroundColor: colors.paper2, borderRadius: 3, borderWidth: 1.5, borderColor: colors.ink,
        }, paper1Style]} />
        <Animated.View style={[{
          position: 'absolute', bottom: 8, width: W * 0.62, height: H * 0.5,
          backgroundColor: colors.white, borderRadius: 3, borderWidth: 1.5, borderColor: colors.ink,
        }, paper2Style]} />
        <Animated.View style={[{
          position: 'absolute', bottom: 8, width: W * 0.62, height: H * 0.5,
          backgroundColor: colors.paper, borderRadius: 3, borderWidth: 1.5, borderColor: colors.ink,
        }, paper3Style]} />
        <Animated.View style={[{
          position: 'absolute', bottom: 0, width: W, backgroundColor: color,
          borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.ink,
        }, flapStyle]} />
      </Animated.View>
    </Pressable>
  );
}
