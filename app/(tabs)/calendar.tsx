import { useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Calendar, toDateId } from '@marceloterreiro/flash-calendar';
import { paperTheme } from '@/features/calendar/theme';
import { useSettings } from '@/features/settings/store';
import { colors, fontFamilies } from '@/ui/tokens';

export default function CalendarScreen() {
  const { week_start } = useSettings();
  const today = useMemo(() => toDateId(new Date()), []);
  const [selected, setSelected] = useState(today);
  const [monthId, setMonthId] = useState(today);
  const onDayPress = useCallback((id: string) => {
    setSelected(id);
    setMonthId(id);
  }, []);
  const firstDayOfWeek = week_start === 'monday' ? 'monday' : 'sunday';
  const theme = useMemo(() => paperTheme(selected), [selected]);
  const activeRanges = useMemo(() => [{ startId: selected, endId: selected }], [selected]);
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, padding: 16 }}>
      <Text style={{ fontFamily: fontFamilies.heading, fontSize: 18, color: colors.ink, marginBottom: 8 }}>
        CALENDAR
      </Text>
      <Calendar
        calendarMonthId={monthId}
        calendarFirstDayOfWeek={firstDayOfWeek}
        calendarActiveDateRanges={activeRanges}
        onCalendarDayPress={onDayPress}
        theme={theme}
      />
    </View>
  );
}
