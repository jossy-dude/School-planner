import { Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, fontFamilies } from '@/ui/tokens';

interface Props { remainingMs: number; totalMs: number; label: string; size?: number; }

export function DotArcClock({ remainingMs, totalMs, label, size = 220 }: Props) {
  const r = size / 2 - 14;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * r;
  // elapsed fraction of the window: arc length itself tracks the REMAINING fraction
  const progress = totalMs > 0 ? 1 - remainingMs / totalMs : 0;
  const remainingRatio = 1 - progress;
  // dot rides the boundary of the filled (remaining) arc
  const theta = -Math.PI / 2 + (1 - progress) * 2 * Math.PI;
  const dotX = cx + r * Math.cos(theta);
  const dotY = cy + r * Math.sin(theta);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke={colors.ink15} strokeWidth={4} fill="none" />
        <Path
          d={`M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r}`}
          stroke={colors.ink} strokeWidth={4} fill="none"
          strokeDasharray={circumference} strokeDashoffset={circumference * (1 - remainingRatio)}
        />
        <Circle cx={dotX} cy={dotY} r={7} fill={colors.ink} />
      </Svg>
      <Text style={{ position: 'absolute', fontFamily: fontFamilies.clock, fontWeight: '900', fontSize: 40, color: colors.ink }}>
        {label}
      </Text>
    </View>
  );
}
