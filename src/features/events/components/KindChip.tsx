import { Pressable, Text, View } from 'react-native';
import { EventKind, KIND_GLYPHS } from '../logic';
import { colors, fontFamilies, radius } from '@/ui/tokens';

export function Chip({ glyph, label, active, onPress, accessibilityLabel }: {
  glyph?: string;
  label: string;
  active: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const pill = {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: radius.pill, borderWidth: 1.5,
    backgroundColor: active ? colors.ink : colors.paper,
    borderColor: colors.ink,
  };
  const text = (
    <>
      {glyph !== undefined && <Text style={{ fontSize: 13 }}>{glyph}</Text>}
      <Text style={{
        fontFamily: fontFamilies.mono, fontSize: 12,
        color: active ? colors.paper : colors.ink,
      }}>{label}</Text>
    </>
  );
  if (!onPress) return <View style={pill}>{text}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={pill}
    >
      {text}
    </Pressable>
  );
}

export function KindChip({ kind, active, onPress }: {
  kind: EventKind;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Chip
      glyph={KIND_GLYPHS[kind]}
      label={kind.toUpperCase()}
      active={active}
      onPress={onPress}
      accessibilityLabel={`kind ${kind}`}
    />
  );
}
