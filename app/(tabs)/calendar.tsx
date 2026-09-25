import { Calendar, toDateId, useCalendar } from '@marceloterreiro/flash-calendar';
import type { CalendarTheme } from '@marceloterreiro/flash-calendar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { ScrollView, Text, View } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import type { Attendance } from '@/db/schema';
import { DayCell } from '@/features/calendar/components/DayCell';
import type { CellFrame } from '@/features/calendar/components/DayCell';
import { DayDetail } from '@/features/calendar/components/DayDetail';
import type { CalendarFilter, DotEvent } from '@/features/calendar/dots';
import { dayDotInfo, dayDots } from '@/features/calendar/dots';
import { listAbsencesInRange, listEventsInRange } from '@/features/calendar/eventsQuery';
import { paperTheme } from '@/features/calendar/theme';
import { useCoursesStore } from '@/features/courses/store';
import { useScheduleStore } from '@/features/schedule/store';
import { useSettings } from '@/features/settings/store';
import { occurrencesOnDay } from '@/lib/schedule';
import { FilterChip } from '@/ui/primitives';
import { colors, fontFamilies } from '@/ui/tokens';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type ItemDayTheme = NonNullable<CalendarTheme['itemDay']>;
type ItemDayStateFn = NonNullable<ItemDayTheme['idle']>;

export default function CalendarScreen() {
  const { week_start } = useSettings();
  const today = useMemo(() => toDateId(new Date()), []);
  const [selected, setSelected] = useState(today);
  const [monthId, setMonthId] = useState(today);
  const [filters, setFilters] = useState<CalendarFilter[]>([]);
  const [detail, setDetail] = useState<{ dateId: string; frame: CellFrame | null } | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [monthEvents, setMonthEvents] = useState<DotEvent[]>([]);
  const [monthAbsences, setMonthAbsences] = useState<Attendance[]>([]);

  const patterns = useScheduleStore((s) => s.patterns);
  const exceptions = useScheduleStore((s) => s.exceptions);
  const refreshSchedule = useScheduleStore((s) => s.refresh);
  const courses = useCoursesStore((s) => s.courses);
  const refreshCourses = useCoursesStore((s) => s.refresh);

  useEffect(() => {
    void refreshSchedule();
    void refreshCourses();
  }, [refreshSchedule, refreshCourses]);

  const firstDayOfWeek = week_start === 'monday' ? 'monday' : 'sunday';
  const theme = useMemo(() => paperTheme(selected), [selected]);
  const activeRanges = useMemo(() => [{ startId: selected, endId: selected }], [selected]);
  const { weeksList, calendarRowMonth, weekDaysList } = useCalendar({
    calendarMonthId: monthId,
    calendarFirstDayOfWeek: firstDayOfWeek,
    calendarActiveDateRanges: activeRanges,
  });

  // Dim out-of-month days while keeping them pressable (they navigate months).
  const itemDayTheme = useMemo<CalendarTheme['itemDay']>(() => {
    const base = theme.itemDay;
    if (!base) return base;
    const withOutside = (pick: ItemDayStateFn) =>
      (p: Parameters<ItemDayStateFn>[0]) => {
        const out = pick(p);
        if (!p.isDifferentMonth) return out;
        return { ...out, content: { ...out.content, color: colors.ink15 } };
      };
    return {
      ...base,
      ...(base.idle ? { idle: withOutside(base.idle) } : {}),
      ...(base.today ? { today: withOutside(base.today) } : {}),
    };
  }, [theme]);

  const gridStart = weeksList[0]?.[0]?.date ?? null;
  const lastWeek = weeksList[weeksList.length - 1];
  const gridEnd = lastWeek?.[lastWeek.length - 1]?.date ?? null;
  const rangeStart = gridStart?.getTime() ?? null;
  const rangeEnd = gridEnd ? gridEnd.getTime() + 86_400_000 : null;

  useEffect(() => {
    if (rangeStart === null || rangeEnd === null) return;
    let alive = true;
    void (async () => {
      const [ev, abs] = await Promise.all([
        listEventsInRange(rangeStart, rangeEnd),
        listAbsencesInRange(toDateId(new Date(rangeStart)), toDateId(new Date(rangeEnd - 1))),
      ]);
      if (!alive) return;
      setMonthEvents(ev.map((e) => ({
        id: e.id,
        kind: e.kind,
        done: e.done,
        dueAtMs: e.dueAt.getTime(),
        title: e.title,
        courseId: e.courseId,
      })));
      setMonthAbsences(abs);
    })();
    return () => { alive = false; };
  }, [rangeStart, rangeEnd]);

  const eventsByDay = useMemo(() => {
    const m = new Map<string, DotEvent[]>();
    for (const e of monthEvents) {
      const key = toDateId(new Date(e.dueAtMs));
      const list = m.get(key);
      if (list) list.push(e);
      else m.set(key, [e]);
    }
    return m;
  }, [monthEvents]);

  const absencesByDay = useMemo(() => {
    const m = new Map<string, Attendance[]>();
    for (const a of monthAbsences) {
      const list = m.get(a.date);
      if (list) list.push(a);
      else m.set(a.date, [a]);
    }
    return m;
  }, [monthAbsences]);

  const occOn = useCallback(
    (dateId: string) => occurrencesOnDay(patterns, exceptions, dateId),
    [patterns, exceptions],
  );

  const selectedInfo = useMemo(
    () => dayDotInfo(
      selected,
      occOn(selected),
      eventsByDay.get(selected) ?? [],
      absencesByDay.get(selected) ?? [],
    ),
    [selected, occOn, eventsByDay, absencesByDay],
  );

  const toggleFilter = useCallback((f: CalendarFilter) => {
    setFilters((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));
  }, []);
  const showAll = useCallback(() => setFilters([]), []);

  const handleDayPress = useCallback((id: string, frame: CellFrame | null) => {
    setSelected(id);
    setMonthId(id);
    setDetail({ dateId: id, frame });
  }, []);
  const closeDetail = useCallback(() => setDetail(null), []);

  const onRootLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  const rootRef = useAnimatedRef<Animated.View>();

  return (
    <Animated.View
      ref={rootRef}
      onLayout={onRootLayout}
      style={{ flex: 1, backgroundColor: colors.paper, padding: 16 }}
    >
      <Text style={{ fontFamily: fontFamilies.heading, fontSize: 18, color: colors.ink, marginBottom: 8 }}>
        CALENDAR
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingBottom: 4 }}
        style={{ marginBottom: 8 }}
      >
        <FilterChip label="ALL" active={filters.length === 0} onPress={showAll} />
        <FilterChip
          label="CLASSES"
          count={selectedInfo.classCount}
          active={filters.includes('CLASSES')}
          onPress={() => toggleFilter('CLASSES')}
        />
        <FilterChip
          label="EXAMS"
          count={selectedInfo.hasExam ? 1 : 0}
          active={filters.includes('EXAMS')}
          onPress={() => toggleFilter('EXAMS')}
        />
        <FilterChip
          label="TASKS"
          count={selectedInfo.hasTask ? 1 : 0}
          active={filters.includes('TASKS')}
          onPress={() => toggleFilter('TASKS')}
        />
        <FilterChip
          label="CLUBS"
          count={selectedInfo.hasClub ? 1 : 0}
          active={filters.includes('CLUBS')}
          onPress={() => toggleFilter('CLUBS')}
        />
      </ScrollView>
      <Calendar.Row.Month height={20} theme={theme.rowMonth}>
        {capitalize(calendarRowMonth)}
      </Calendar.Row.Month>
      <Calendar.Row.Week spacing={8} theme={theme.rowWeek}>
        {weekDaysList.map((wd, i) => (
          <Calendar.Item.WeekName key={`${i}-${wd}`} height={24} theme={theme.itemWeekName}>
            {wd}
          </Calendar.Item.WeekName>
        ))}
      </Calendar.Row.Week>
      <View style={{ gap: 8, marginTop: 8 }}>
        {weeksList.map((week, wi) => (
          <Calendar.Row.Week key={week[0]?.id ?? `w${wi}`} spacing={8} theme={theme.rowWeek}>
            {week.map((day) => {
              const info = dayDotInfo(
                day.id,
                occOn(day.id),
                eventsByDay.get(day.id) ?? [],
                absencesByDay.get(day.id) ?? [],
              );
              return (
                <DayCell
                  key={day.id}
                  day={day}
                  theme={itemDayTheme}
                  dots={dayDots(info, filters)}
                  onDayPress={handleDayPress}
                  rootRef={rootRef}
                />
              );
            })}
          </Calendar.Row.Week>
        ))}
      </View>
      {detail ? (
        <DayDetail
          dateId={detail.dateId}
          sourceFrame={detail.frame}
          containerWidth={size.width}
          containerHeight={size.height}
          courses={courses}
          occurrences={occOn(detail.dateId)}
          events={eventsByDay.get(detail.dateId) ?? []}
          absences={absencesByDay.get(detail.dateId) ?? []}
          filters={filters}
          onClose={closeDetail}
        />
      ) : null}
    </Animated.View>
  );
}
