import { View } from 'react-native';
import { colors, radius } from '@/ui/tokens';

// Dumb horizontal fill bar: value is a 0..1 fraction, clamped. No animation.
export function ScoreBar({ value }: { value: number }) {
  const pct = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={{
        height: 16,
        flexDirection: 'row',
        borderWidth: 2,
        borderColor: colors.ink,
        backgroundColor: colors.ink15,
        borderRadius: radius.sm,
        overflow: 'hidden',
      }}
    >
      <View style={{ width: `${pct * 100}%`, alignSelf: 'stretch', backgroundColor: colors.ink }} />
    </View>
  );
}
