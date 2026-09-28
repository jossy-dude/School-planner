import type { CalendarDayMetadata } from '@marceloterreiro/flash-calendar';
import { Pressable, Text, View } from 'react-native';
import type { DayDotSpec, DotInfo } from '@/features/calendar/dots';
import { colors, fontFamilies } from '@/ui/tokens';

export const DAY_CELL_HEIGHT = 68;

interface DayCellProps {
  day: CalendarDayMetadata;
  info: DotInfo;
  dots: readonly DayDotSpec[];
  selected: boolean;
  onDayPress: (id: string) => void;
}

// A rounded paper tile in the Pocket Cal mould — the number, a small class-count
// badge, a line or two of tag text, and a row of colored dots along the bottom.
// Quiet days stay hollow; days with something on them fill in like a marked square.
export function DayCell({ day, info, dots, selected, onDayPress }: DayCellProps) {
  const busy = info.classCount + info.examCount + info.taskCount + info.clubCount > 0 || info.hasAbsence;
  const today = day.isToday;
  const out = day.isDifferentMonth;

  const fg = today ? colors.paper : colors.ink;
  const sub = today ? colors.paper : colors.ink70;

  const tags: { text: string; color: string }[] = [];
  if (info.examCount > 0) tags.push({ text: info.examCount > 1 ? `${info.examCount} EXAMS` : 'EXAM', color: today ? colors.paper : colors.danger });
  if (info.taskCount > 0) tags.push({ text: `${info.taskCount} DUE`, color: sub });
  if (info.clubCount > 0 && tags.length < 2) tags.push({ text: 'CLUB', color: sub });

  return (
    <Pressable
      onPress={() => onDayPress(day.id)}
      accessibilityRole="button"
      accessibilityLabel={`${day.id}${busy ? ', has plans' : ''}`}
      accessibilityState={{ selected }}
      style={{
        flex: 1, height: DAY_CELL_HEIGHT, borderRadius: 12, padding: 5,
        borderWidth: selected ? 2.5 : busy ? 1.5 : 1, opacity: out ? 0.38 : 1,
        borderColor: selected || busy || today ? colors.ink : colors.ink15,
        backgroundColor: today ? colors.ink : busy ? colors.paper2 : 'transparent',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: fontFamilies.heading, fontSize: 13, color: fg }}>{day.displayLabel}</Text>
        {info.classCount > 0 && (
          <View style={{
            minWidth: 14, height: 14, borderRadius: 7, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center',
            backgroundColor: today ? colors.paper : colors.ink,
          }}>
            <Text style={{ fontFamily: fontFamilies.lcd, fontSize: 8, color: today ? colors.ink : colors.paper }}>
              {info.classCount}
            </Text>
          </View>
        )}
      </View>
      <View style={{ gap: 1 }}>
        {tags.slice(0, 2).map((t) => (
          <Text key={t.text} numberOfLines={1} style={{ fontFamily: fontFamilies.mono, fontSize: 7.5, color: t.color, letterSpacing: 0.3 }}>
            {t.text}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 3, height: 6, alignItems: 'center' }}>
        {dots.map((d, i) => (
          <View
            key={`${d.shape}-${d.color}-${i}`}
            style={{
              width: 5, height: 5, borderRadius: d.shape === 'diamond' ? 0.5 : 2.5,
              backgroundColor: d.color,
              borderWidth: today ? 0.75 : 0, borderColor: colors.paper,
              transform: d.shape === 'diamond' ? [{ rotate: '45deg' }] : undefined,
            }}
          />
        ))}
      </View>
    </Pressable>
  );
}
