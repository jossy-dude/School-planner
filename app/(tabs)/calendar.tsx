import { Calendar, toDateId, useCalendar } from '@marceloterreiro/flash-calendar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import type { Attendance } from '@/db/schema';
import { listAttendanceInRange } from '@/features/attendance/queries';
import { DayCell } from '@/features/calendar/components/DayCell';
import type { CalendarFilter, DotEvent } from '@/features/calendar/dots';
import { dayDotInfo, dayDots } from '@/features/calendar/dots';
import { paperTheme } from '@/features/calendar/theme';
import { useCoursesStore } from '@/features/courses/store';
import { listEventsInRange } from '@/features/events/queries';
import { useScheduleStore } from '@/features/schedule/store';
import { useSettings } from '@/features/settings/store';
import { occurrencesOnDay } from '@/lib/schedule';
import { FilterChip, SquareIconButton } from '@/ui/primitives';
import { colors, fontFamilies } from '@/ui/tokens';
import { ScreenBackground } from '@/ui/ScreenBackground';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function CalendarScreen() {
  const { week_start } = useSettings();
  const today = useMemo(() => toDateId(new Date()), []);
  const [selected, setSelected] = useState(today);
  const [monthId, setMonthId] = useState(today);
  const [filters, setFilters] = useState<CalendarFilter[]>([]);
  const [monthEvents, setMonthEvents] = useState<DotEvent[]>([]);
  const [monthAttendance, setMonthAttendance] = useState<Attendance[]>([]);
  const loadedRangeRef = useRef<string | null>(null);

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

  const gridStart = weeksList[0]?.[0]?.date ?? null;
  const lastWeek = weeksList[weeksList.length - 1];
  const gridEnd = lastWeek?.[lastWeek.length - 1]?.date ?? null;
  const rangeStart = gridStart?.getTime() ?? null;
  const rangeEnd = gridEnd ? gridEnd.getTime() + 86_400_000 : null;
  const rangeIdStart = rangeStart === null ? null : toDateId(new Date(rangeStart));
  const rangeIdEnd = rangeEnd === null ? null : toDateId(new Date(rangeEnd - 1));

  const loadAttendance = useCallback(async (): Promise<Attendance[]> => {
    if (rangeIdStart === null || rangeIdEnd === null) return [];
    return listAttendanceInRange(rangeIdStart, rangeIdEnd);
  }, [rangeIdStart, rangeIdEnd]);

  // Reloads when the visible range changes (month nav) and when focus returns
  // (e.g. after the event modal closes), so new event dots show up immediately.
  useFocusEffect(
    useCallback(() => {
      if (rangeStart === null || rangeEnd === null) return;
      let alive = true;
      void (async () => {
        const rangeKey = `${rangeIdStart}:${rangeIdEnd}`;
        if (loadedRangeRef.current !== rangeKey) {
          setMonthEvents([]);
          setMonthAttendance([]);
        }
        const [ev, rows] = await Promise.all([
          listEventsInRange(rangeStart, rangeEnd),
          loadAttendance(),
        ]);
        if (!alive) return;
        loadedRangeRef.current = rangeKey;
        setMonthEvents(ev.map((e) => ({
          id: e.id,
          kind: e.kind,
          done: e.done,
          dueAtMs: e.dueAt.getTime(),
          title: e.title,
          courseId: e.courseId,
        })));
        setMonthAttendance(rows);
      })().catch(() => {});
      return () => { alive = false; };
    }, [rangeStart, rangeEnd, rangeIdStart, rangeIdEnd, loadAttendance]),
  );

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

  const attendanceByDay = useMemo(() => {
    const m = new Map<string, Attendance[]>();
    for (const a of monthAttendance) {
      const list = m.get(a.date);
      if (list) list.push(a);
      else m.set(a.date, [a]);
    }
    return m;
  }, [monthAttendance]);

  const absencesByDay = useMemo(() => {
    const m = new Map<string, Attendance[]>();
    for (const [date, rows] of attendanceByDay) {
      const absent = rows.filter((a) => a.status === 'absent');
      if (absent.length > 0) m.set(date, absent);
    }
    return m;
  }, [attendanceByDay]);

  const courseColor = useMemo(() => new Map(courses.map((c) => [c.id, c.color])), [courses]);

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

  const handleDayPress = useCallback((id: string) => {
    setSelected(id);
    setMonthId(id);
    router.push({ pathname: '/day/[date]', params: { date: id } });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, padding: 16 }}>
      <ScreenBackground />
      <View style={{
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
      }}>
        <Text style={{ fontFamily: fontFamilies.heading, fontSize: 18, color: colors.ink }}>
          CALENDAR
        </Text>
        <SquareIconButton
          glyph="◆"
          label="add event"
          onPress={() => router.push({ pathname: '/event/[id]', params: { id: 'new', dueAt: selected } })}
        />
      </View>
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
          count={selectedInfo.examCount}
          active={filters.includes('EXAMS')}
          onPress={() => toggleFilter('EXAMS')}
        />
        <FilterChip
          label="TASKS"
          count={selectedInfo.taskCount}
          active={filters.includes('TASKS')}
          onPress={() => toggleFilter('TASKS')}
        />
        <FilterChip
          label="CLUBS"
          count={selectedInfo.clubCount}
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
              const classColors = occOn(day.id).map((o) => courseColor.get(o.courseId) ?? colors.ink);
              return (
                <DayCell
                  key={day.id}
                  day={day}
                  info={info}
                  dots={dayDots(info, filters, classColors)}
                  selected={day.id === selected}
                  onDayPress={handleDayPress}
                />
              );
            })}
          </Calendar.Row.Week>
        ))}
      </View>
    </View>
  );
}
