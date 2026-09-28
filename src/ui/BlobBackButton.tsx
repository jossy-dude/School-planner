import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing, runOnJS, useAnimatedProps, useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, FeColorMatrix, FeGaussianBlur, Filter, G } from 'react-native-svg';
import { playSound } from '@/lib/sound';
import { colors, hardShadow } from '@/ui/tokens';

// Real technique, not a fake: this is the classic web "goo" filter used by
// gooey bubble-menus and liquid buttons — feGaussianBlur softens two circles
// into overlapping haze, feColorMatrix pushes the alpha channel back to a
// hard 0/1 edge, so wherever the blurred blobs still overlap enough they read
// as one fused shape, and where they've pulled apart they snap back into two
// crisp circles. react-native-svg ships both filter primitives natively, so
// this runs the same recipe on-device rather than approximating it with
// opacity fades.

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const DURATION = 340;
const CANVAS_SCALE = 2; // extra room around the button so the blur/droplet isn't clipped

const springPress = (press: ReturnType<typeof useSharedValue<number>>, to: number) => {
  press.value = withTiming(to, { duration: to === 0 ? 120 : 80 });
};

export function BlobBackButton({ onPress, size = 44 }: { onPress: () => void; size?: number }) {
  const t = useSharedValue(0);
  const press = useSharedValue(0);
  const [busy, setBusy] = useState(false);

  const canvas = size * CANVAS_SCALE;
  const cx = canvas / 2;
  const cy = canvas / 2;
  const mainR = size * 0.42;
  const travel = size * 0.68;

  const fire = () => {
    if (busy) return;
    setBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    playSound('pop');
    t.value = withTiming(1, { duration: DURATION, easing: Easing.out(Easing.cubic) }, (finished) => {
      if (finished) runOnJS(onPress)();
    });
  };

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: press.value }, { translateY: press.value }],
  }));

  // The droplet: starts coincident with the main circle at r=0 (invisible —
  // fully "merged"), grows and drifts up-left while the goo filter draws a
  // liquid neck between it and the main body, then shrinks and fades over the
  // last third of the trip as it "pinches off" and drips away.
  const dropletProps = useAnimatedProps(() => {
    const p = t.value;
    const grow = Math.sin(Math.min(1, p / 0.55) * (Math.PI / 2));
    const shrink = p > 0.65 ? Math.max(0, 1 - (p - 0.65) / 0.35) : 1;
    return {
      cx: cx - p * travel,
      cy: cy - p * travel * 0.8,
      r: Math.max(0, mainR * 0.6 * grow * shrink),
    };
  });

  return (
    <Pressable
      onPress={fire}
      onPressIn={() => springPress(press, 2)}
      onPressOut={() => springPress(press, 0)}
      accessibilityRole="button"
      accessibilityLabel="go back"
      hitSlop={8}
      style={{ width: size, height: size }}
    >
      <View pointerEvents="none" style={{
        position: 'absolute', left: -(canvas - size) / 2, top: -(canvas - size) / 2, width: canvas, height: canvas,
      }}>
        <Svg width={canvas} height={canvas}>
          <Defs>
            <Filter id="goo" x="-60%" y="-60%" width="220%" height="220%">
              <FeGaussianBlur in="SourceGraphic" stdDeviation={size * 0.09} />
              <FeColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9" />
            </Filter>
          </Defs>
          <G filter="url(#goo)">
            <Circle cx={cx} cy={cy} r={mainR} fill={colors.ink} />
            <AnimatedCircle
              cx={cx}
              cy={cy}
              r={0}
              fill={colors.ink}
              animatedProps={dropletProps}
            />
          </G>
        </Svg>
      </View>
      <Animated.View style={[{
        width: size, height: size, alignItems: 'center', justifyContent: 'center',
        borderRadius: size / 2, ...hardShadow,
      }, pressStyle]}>
        <Text style={{ fontSize: size * 0.42, color: colors.paper }}>←</Text>
      </Animated.View>
    </Pressable>
  );
}
