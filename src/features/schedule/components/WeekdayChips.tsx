import { Pressable, Text, View } from 'react-native';
import { colors, fontFamilies, radius } from '@/ui/tokens';

const DAYS = [
  { id: 'sun', letter: 'S', weekday: 0 },
  { id: 'mon', letter: 'M', weekday: 1 },
  { id: 'tue', letter: 'T', weekday: 2 },
  { id: 'wed', letter: 'W', weekday: 3 },
  { id: 'thu', letter: 'T', weekday: 4 },
  { id: 'fri', letter: 'F', weekday: 5 },
  { id: 'sat', letter: 'S', weekday: 6 },
] as const;

export function WeekdayChips({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {DAYS.map((day) => {
        const active = value === day.weekday;
        return (
          <Pressable
            key={day.id}
            onPress={() => onChange(day.weekday)}
            accessibilityRole="button"
            accessibilityLabel={`weekday ${day.weekday}`}
            accessibilityState={{ selected: active }}
            style={{
              width: 40, height: 40, flexShrink: 1,
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 2, borderRadius: radius.sm,
              borderColor: active ? colors.ink : colors.ink15,
              backgroundColor: active ? colors.ink : colors.paper,
            }}
          >
            <Text style={{ fontFamily: fontFamilies.mono, fontSize: 15, color: active ? colors.paper : colors.ink }}>
              {day.letter}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
