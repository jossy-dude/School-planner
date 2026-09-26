import { Pressable, ScrollView, Text, View } from 'react-native';
import { Course } from '@/db/schema';
import { colors, fontFamilies, radius } from '@/ui/tokens';

interface Props {
  courses: Course[];
  selectedId: string | null;
  onSelect: (courseId: string | null) => void;
  disabled?: boolean;
}

function Chip({ label, a11yLabel, active, disabled, onPress }:
  { label: string; a11yLabel?: string; active: boolean; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel ?? label}
      accessibilityState={{ selected: active, disabled }}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.ink,
        backgroundColor: active ? colors.ink : colors.paper,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Text style={{
        fontFamily: fontFamilies.mono, fontSize: 13,
        color: active ? colors.paper : colors.ink,
      }}>{label}</Text>
    </Pressable>
  );
}

export function SubjectPicker({ courses, selectedId, onSelect, disabled = false }: Props) {
  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: 'row', gap: 6 }}
      >
        <Chip label="NONE" active={selectedId === null} disabled={disabled} onPress={() => onSelect(null)} />
        {courses.map((course) => (
          <Chip
            key={course.id}
            label={course.emoji}
            a11yLabel={course.name}
            active={selectedId === course.id}
            disabled={disabled}
            onPress={() => onSelect(course.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
