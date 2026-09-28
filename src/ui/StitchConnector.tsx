import { useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '@/ui/tokens';

// The "hanging" look from the reference: one card tethered to the next by a
// dotted stitch with a small eyelet at each end, so stacked cards read as
// physically holding each other. Sits in the gap between two cards; `fromX` /
// `toX` are 0..1 fractions of the width so consecutive connectors can zig-zag.
export function StitchConnector({ height = 30, fromX = 0.78, toX = 0.22 }: {
  height?: number; fromX?: number; toX?: number;
}) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const x1 = width * fromX;
  const x2 = width * toX;
  const r = 3.5;
  const d = `M ${x1} ${r} C ${x1} ${height * 0.75}, ${x2} ${height * 0.25}, ${x2} ${height - r}`;
  return (
    <View onLayout={onLayout} pointerEvents="none" style={{ height, marginVertical: -6, zIndex: 2 }}>
      {width > 0 && (
        <Svg width={width} height={height}>
          <Path d={d} stroke={colors.ink} strokeWidth={1.5} strokeDasharray="1 5" strokeLinecap="round" fill="none" />
          <Circle cx={x1} cy={r} r={r} fill={colors.paper} stroke={colors.ink} strokeWidth={1.5} />
          <Circle cx={x2} cy={height - r} r={r} fill={colors.paper} stroke={colors.ink} strokeWidth={1.5} />
        </Svg>
      )}
    </View>
  );
}
