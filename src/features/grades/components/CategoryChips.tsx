import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Pressable, Text, TextInput, View } from 'react-native';
import { GradeCategory } from '@/db/schema';
import { SquareIconButton } from '@/ui/primitives';
import { colors, fontFamilies, radius } from '@/ui/tokens';

const chipBase = {
  flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6,
  paddingHorizontal: 12, paddingVertical: 6,
  borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.ink,
};

const fieldBox = {
  borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.paper,
  borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8,
  fontFamily: fontFamilies.body, fontSize: 15, color: colors.ink,
} as const;

export function Chip({ label, active = false, onPress, onLongPress }: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const style = [chipBase, { backgroundColor: active ? colors.ink : colors.paper }];
  const text = (
    <Text style={{ fontFamily: fontFamilies.mono, fontSize: 12, color: active ? colors.paper : colors.ink }}>
      {label}
    </Text>
  );
  if (onPress === undefined && onLongPress === undefined) return <View style={style}>{text}</View>;
  return (
    <Pressable
      onPress={onPress === undefined ? undefined : () => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityState={active ? { selected: true } : undefined}
      accessibilityLabel={label}
      style={style}
    >
      {text}
    </Pressable>
  );
}

export function categoryChipLabel(category: GradeCategory): string {
  return `${category.name} ${Math.round(category.weight)}%`;
}

// Two modes, one component:
// - select mode (onSelect): NONE chip + tap-to-pick, used inside GradeForm.
// - manage mode (onLongPress/onAdd): display chips with weights, long-press to
//   delete, trailing + that opens a tiny inline add row (no Alert.prompt — it's
//   iOS-only and this app targets Android).
export function CategoryChips({ categories, selectedId, onSelect, onLongPress, onAdd }: {
  categories: GradeCategory[];
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onLongPress?: (category: GradeCategory) => void;
  onAdd?: (draft: { name: string; weight: number }) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [weight, setWeight] = useState('100');
  const manage = onAdd !== undefined || onLongPress !== undefined;
  const select = onSelect !== undefined;

  const submit = () => {
    const trimmed = name.trim();
    if (trimmed.length === 0) return;
    const parsed = weight.trim() === '' ? Number.NaN : Number(weight);
    const next = Number.isFinite(parsed) ? Math.min(100, Math.max(0, Math.round(parsed))) : 100;
    onAdd?.({ name: trimmed, weight: next });
    setName('');
    setWeight('100');
    setAdding(false);
  };

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {select && (
          <Chip
            label="NONE"
            active={selectedId === null || selectedId === undefined}
            onPress={() => onSelect?.(null)}
          />
        )}
        {categories.map((c) => (
          <Chip
            key={c.id}
            label={categoryChipLabel(c)}
            active={select && selectedId === c.id}
            onPress={select ? () => onSelect?.(c.id) : undefined}
            onLongPress={manage ? () => onLongPress?.(c) : undefined}
          />
        ))}
        {manage && (
          <SquareIconButton glyph="+" size={28} label="add category" onPress={() => setAdding((v) => !v)} />
        )}
      </View>
      {manage && adding && (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. HW"
            placeholderTextColor={colors.ink40}
            style={[fieldBox, { flex: 1 }]}
            accessibilityLabel="category name"
          />
          <TextInput
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
            placeholder="40"
            placeholderTextColor={colors.ink40}
            style={[fieldBox, { width: 68, fontFamily: fontFamilies.lcd }]}
            accessibilityLabel="category weight percent"
          />
          <Text style={{ fontFamily: fontFamilies.mono, fontSize: 12, color: colors.ink40 }}>%</Text>
          <SquareIconButton glyph="✓" size={32} label="confirm add category" onPress={submit} />
        </View>
      )}
    </View>
  );
}
