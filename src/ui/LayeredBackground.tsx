import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { colors } from '@/ui/tokens';

// Depth without leaving the paper: three sheets stacked behind the content that
// drift at different fractions of the scroll speed (the same trick side-scrolling
// games use to make a flat world feel deep). Far sheet = faint graph-paper grid,
// mid sheet = eraser smudges and a pencil ring, near = the scroll content itself.
const GRID = 36;

function Grid({ width, height }: { width: number; height: number }) {
  // One path for every line: far cheaper than hundreds of <Line/> nodes.
  let d = '';
  for (let x = 0; x <= width; x += GRID) d += `M ${x} 0 V ${height} `;
  for (let y = 0; y <= height; y += GRID) d += `M 0 ${y} H ${width} `;
  return (
    <Svg width={width} height={height}>
      <Path d={d} stroke={colors.ink15} strokeWidth={0.6} opacity={0.55} fill="none" />
    </Svg>
  );
}

export function LayeredBackground({ scrollY }: { scrollY: SharedValue<number> }) {
  const { width, height } = useWindowDimensions();
  const farHeight = height * 2.2;

  const far = useAnimatedStyle(() => ({ transform: [{ translateY: -scrollY.value * 0.12 }] }));
  const mid = useAnimatedStyle(() => ({ transform: [{ translateY: -scrollY.value * 0.3 }] }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0 }, far]}>
        <Grid width={width} height={farHeight} />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0 }, mid]}>
        <Svg width={width} height={farHeight}>
          <Ellipse cx={width * 0.82} cy={height * 0.32} rx={62} ry={38} fill={colors.ink15} opacity={0.35} />
          <Ellipse cx={width * 0.15} cy={height * 0.78} rx={78} ry={44} fill={colors.ink15} opacity={0.28} />
          <Circle cx={width * 0.2} cy={height * 0.2} r={46} stroke={colors.ink15} strokeWidth={2} fill="none" opacity={0.6} />
          <Path
            d={`M ${width * 0.6} ${height * 1.1} q 24 -20 48 0 t 48 0 t 48 0`}
            stroke={colors.ink15} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.6}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}
