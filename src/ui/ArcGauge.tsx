import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, fontFamilies } from '@/ui/tokens';

interface Props {
  value: number;
  max: number;
  label: string;
  size?: number;
  decimals?: number;
}

export function ArcGauge({ value, max, label, size = 180, decimals = 2 }: Props) {
  const stroke = 10;
  const r = size / 2 - stroke / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const safeMax = Number.isFinite(max) && max > 0 ? max : 1;
  const raw = Number.isFinite(value) ? value : 0;
  const ratio = Math.min(1, Math.max(0, raw / safeMax));
  const decimalsSafe = Number.isFinite(decimals) ? Math.min(3, Math.max(0, Math.trunc(decimals))) : 2;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke={colors.ink15} strokeWidth={stroke} fill="none" />
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={colors.ink}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center', gap: 2 }}>
        <Text style={{ fontFamily: fontFamilies.clock, fontSize: 44, color: colors.ink }}>
          {raw.toFixed(decimalsSafe)}
        </Text>
        <Text style={{ fontFamily: fontFamilies.mono, fontSize: 12, color: colors.ink40, letterSpacing: 2 }}>
          {label}
        </Text>
      </View>
    </View>
  );
}
