import { Pressable, Text, View } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { colors, fontFamilies, hardShadow, radius } from '@/ui/tokens';

export function FilterChip({ label, count, active, onPress }:
  { label: string; count?: number; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: radius.pill,
        borderWidth: 1.5,
        backgroundColor: active ? colors.ink : colors.paper,
        borderColor: colors.ink,
      }}
    >
      <Text style={{
        fontFamily: fontFamilies.mono, fontSize: 12,
        color: active ? colors.paper : colors.ink,
      }}>{label}</Text>
      {count !== undefined && (
        <View style={{
          minWidth: 18, paddingHorizontal: 4, borderRadius: radius.pill,
          backgroundColor: active ? colors.paper : colors.ink,
        }}>
          <Text style={{
            fontFamily: fontFamilies.lcd, fontSize: 10,
            color: active ? colors.ink : colors.paper, textAlign: 'center',
          }}>{count}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function SegmentedChips({ options, value, onChange }:
  { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{
      flexDirection: 'row', backgroundColor: colors.paper,
      borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.ink, padding: 3,
    }}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <Pressable key={opt} onPress={() => onChange(opt)} style={{ flex: 1 }}>
            <View style={{
              paddingVertical: 6, borderRadius: radius.pill,
              backgroundColor: active ? colors.ink : 'transparent',
            }}>
              <Text style={{
                fontFamily: fontFamilies.mono, fontSize: 12, textAlign: 'center',
                color: active ? colors.paper : colors.ink40,
              }}>{opt}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stamp({ text, tone = 'ink' }: { text: string; tone?: 'ink' | 'danger' }) {
  return (
    <View style={{
      borderWidth: 2, borderColor: tone === 'danger' ? colors.danger : colors.ink,
      paddingHorizontal: 8, paddingVertical: 2, transform: [{ rotate: '-6deg' }],
    }}>
      <Text style={{
        fontFamily: fontFamilies.stamp, fontSize: 14,
        color: tone === 'danger' ? colors.danger : colors.ink, letterSpacing: 2,
      }}>{text}</Text>
    </View>
  );
}

const springPress = (press: SharedValue<number>, to: number) => {
  press.value = withSpring(to, { damping: 30, stiffness: 700 });
};

type IconButtonTone = 'ink' | 'danger' | 'ink70';

const TONE_COLORS: Record<IconButtonTone, string> = {
  ink: colors.ink,
  danger: colors.danger,
  ink70: colors.ink70,
};

export function SquareIconButton({ glyph, onPress, tone = 'ink', size = 44, active = false, label }:
  { glyph: string; onPress: () => void; tone?: IconButtonTone; size?: number; active?: boolean; label?: string }) {
  const press = useSharedValue(0);
  const toneColor = TONE_COLORS[tone];
  const background = active ? toneColor : colors.paper;
  const foreground = active ? colors.paper : toneColor;
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: press.value }, { translateY: press.value }],
    shadowOpacity: 1 - press.value / 3,
  }));
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => springPress(press, 3)}
      onPressOut={() => springPress(press, 0)}
      accessibilityRole="button"
      accessibilityLabel={label ?? glyph}
      accessibilityState={active ? { selected: true } : undefined}
    >
      <Animated.View style={[{
        width: size, height: size, backgroundColor: background,
        borderWidth: 2, borderColor: toneColor,
        alignItems: 'center', justifyContent: 'center', ...hardShadow,
      }, style]}>
        <Text style={{ fontSize: size * 0.45, color: foreground }}>
          {glyph}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function TMinusChip({ text }: { text: string }) {
  return (
    <View style={{
      backgroundColor: colors.ink, paddingHorizontal: 8, paddingVertical: 3,
      borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.ink,
    }}>
      <Text style={{ fontFamily: fontFamilies.lcd, fontSize: 13, color: colors.paper }}>
        {text}
      </Text>
    </View>
  );
}

export function EmptyState({ glyph, label }: { glyph: string; label: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, gap: 8 }}>
      <Text style={{ fontSize: 40, color: colors.ink15 }}>{glyph}</Text>
      <Text style={{ fontFamily: fontFamilies.mono, fontSize: 13, color: colors.ink40 }}>
        {label}
      </Text>
    </View>
  );
}
