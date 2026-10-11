import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  SharedValue, runOnJS, useAnimatedStyle, useSharedValue, withSpring,
} from 'react-native-reanimated';
import type { Attendance } from '@/db/schema';
import { AttendanceButtons } from '@/features/attendance/components/AttendanceButtons';
import { statusStamp } from '@/features/attendance/logic';
import type { AttendanceStatus } from '@/features/attendance/logic';
import { listAttendanceInRange, upsertAttendance } from '@/features/attendance/queries';
import { buildDaySections } from '@/features/calendar/daySections';
import type { DayRow } from '@/features/calendar/daySections';
import type { DotEvent } from '@/features/calendar/dots';
import { useCoursesStore } from '@/features/courses/store';
import { moveDueToDay, tMinusLabel } from '@/features/events/logic';
import { listEventsInRange } from '@/features/events/queries';
import { useEventsStore } from '@/features/events/store';
import { isValidDateId, WEEKDAY_SHORT } from '@/features/schedule/logic';
import { useScheduleStore } from '@/features/schedule/store';
import { useSettings } from '@/features/settings/store';
import { formatTimeOfDay } from '@/lib/format';
import { occurrencesOnDay, parseDateId, toDateId } from '@/lib/schedule';
import { playSound } from '@/lib/sound';
import { BlobBackButton } from '@/ui/BlobBackButton';
import { EmptyState, SquareIconButton, Stamp, TMinusChip } from '@/ui/primitives';
import { colors, fontFamilies, hardShadow, radius } from '@/ui/tokens';
import { ScreenBackground } from '@/ui/ScreenBackground';

interface Frame { x: number; y: number; w: number; h: number }
const DAY_MS = 86_400_000;

function hitChip(frames: Frame[], x: number, y: number): number {
  'worklet';
  for (let i = 0; i < frames.length; i += 1) {
    const f = frames[i];
    if (f && x >= f.x && x <= f.x + f.w && y >= f.y - 12 && y <= f.y + f.h + 12) return i;
  }
  return -1;
}

const setFrames = (sv: SharedValue<Frame[]>, next: Frame[]) => { sv.value = next; };
const clearHover = (sv: SharedValue<number>) => { sv.value = -1; };
// Worklet-side writers: the immutability lint rejects writing a prop-passed
// shared value inline, so the gesture callbacks go through these instead.
function writeHover(sv: SharedValue<number>, v: number) {
  'worklet';
  sv.value = v;
}

function weekDays(dateId: string, weekStart: 'sunday' | 'monday'): string[] {
  const d = parseDateId(dateId);
  const offset = weekStart === 'monday' ? (d.getDay() + 6) % 7 : d.getDay();
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset);
  return Array.from({ length: 7 }, (_, i) => toDateId(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)));
}

function WeekChip({ dateId, active, count, index, hover, onLayoutRef, onPress }: {
  dateId: string; active: boolean; count: number; index: number; hover: SharedValue<number>;
  onLayoutRef: (i: number, node: View | null) => void; onPress: () => void;
}) {
  const style = useAnimatedStyle(() => {
    const hot = hover.value === index;
    return { transform: [{ scale: withSpring(hot ? 1.14 : 1, { damping: 14 }) }], backgroundColor: hot ? colors.ink : active ? colors.paper2 : colors.paper };
  });
  const textStyle = useAnimatedStyle(() => ({ color: hover.value === index ? colors.paper : colors.ink }));
  const d = parseDateId(dateId);
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={`go to ${dateId}`}>
      <Animated.View
        ref={(n: unknown) => onLayoutRef(index, n as View | null)}
        style={[{
          alignItems: 'center', paddingVertical: 8, gap: 2, borderRadius: radius.md,
          borderWidth: active ? 2 : 1, borderColor: active ? colors.ink : colors.ink15,
        }, style]}
      >
        <Animated.Text style={[{ fontFamily: fontFamilies.mono, fontSize: 9, letterSpacing: 1 }, textStyle]}>
          {WEEKDAY_SHORT[d.getDay()]}
        </Animated.Text>
        <Animated.Text style={[{ fontFamily: fontFamilies.heading, fontSize: 15 }, textStyle]}>{d.getDate()}</Animated.Text>
        <View style={{ flexDirection: 'row', gap: 2, height: 5 }}>
          {Array.from({ length: Math.min(count, 3) }, (_, i) => (
            <View key={i} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.ink40 }} />
          ))}
        </View>
      </Animated.View>
    </Pressable>
  );
}

function DraggableEvent({ row, nowMs, frames, hover, onBegin, onDrop, onOpen }: {
  row: DayRow; nowMs: number; frames: SharedValue<Frame[]>; hover: SharedValue<number>;
  onBegin: () => void; onDrop: (chipIndex: number) => void; onOpen: () => void;
}) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const lift = useSharedValue(0);

  const pan = Gesture.Pan()
    .activateAfterLongPress(220)
    .onStart(() => {
      lift.value = withSpring(1);
      runOnJS(onBegin)();
    })
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY;
      writeHover(hover, hitChip(frames.value, e.absoluteX, e.absoluteY));
    })
    .onEnd(() => {
      const idx = hover.value;
      if (idx >= 0) runOnJS(onDrop)(idx);
    })
    .onFinalize(() => {
      writeHover(hover, -1);
      lift.value = withSpring(0);
      tx.value = withSpring(0, { damping: 16 });
      ty.value = withSpring(0, { damping: 16 });
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: 1 + lift.value * 0.04 }, { rotateZ: `${lift.value * -1.5}deg` }],
    zIndex: lift.value > 0.01 ? 50 : 0,
    shadowOpacity: lift.value,
  }));

  const label = row.dueAtMs !== undefined ? tMinusLabel(row.dueAtMs, nowMs) : '';
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[{
        backgroundColor: colors.paper, borderWidth: 1.5, borderColor: colors.ink, borderRadius: radius.md,
        shadowColor: colors.ink, shadowOffset: { width: 3, height: 5 }, shadowRadius: 0, elevation: 0,
      }, style]}>
        <Pressable
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel={`edit ${row.title}. Press and hold, then drag onto a day above to reschedule`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }}
        >
          <Text style={{ fontFamily: fontFamilies.mono, fontSize: 14, color: colors.ink40 }}>⋮⋮</Text>
          {row.done ? <Stamp text="DONE" /> : <TMinusChip text={label} tone={label === 'OVERDUE' ? 'danger' : 'ink'} />}
          <Text style={{ fontSize: 16 }}>{row.emoji}</Text>
          <Text numberOfLines={1} style={{ flex: 1, fontFamily: fontFamilies.mono, fontSize: 13, color: colors.ink }}>{row.title}</Text>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

export default function DayScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const { week_start } = useSettings();
  const [dateId, setDateId] = useState(() => (date !== undefined && isValidDateId(date) ? date : toDateId(new Date())));
  const [weekEvents, setWeekEvents] = useState<DotEvent[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [nowMs] = useState(() => Date.now());

  const patterns = useScheduleStore((s) => s.patterns);
  const exceptions = useScheduleStore((s) => s.exceptions);
  const refreshSchedule = useScheduleStore((s) => s.refresh);
  const courses = useCoursesStore((s) => s.courses);
  const refreshCourses = useCoursesStore((s) => s.refresh);
  const updateEvent = useEventsStore((s) => s.update);

  const days = useMemo(() => weekDays(dateId, week_start), [dateId, week_start]);
  const frames = useSharedValue<Frame[]>([]);
  const hover = useSharedValue(-1);
  const chipNodes = useRef<(View | null)[]>([]);

  const load = useCallback(async () => {
    const first = days[0];
    const last = days[days.length - 1];
    if (!first || !last) return;
    const start = parseDateId(first).getTime();
    const [ev, att] = await Promise.all([
      listEventsInRange(start, start + 7 * DAY_MS),
      listAttendanceInRange(dateId, dateId),
    ]);
    setWeekEvents(ev.map((e) => ({ id: e.id, kind: e.kind, done: e.done, dueAtMs: e.dueAt.getTime(), title: e.title, courseId: e.courseId })));
    setAttendance(att);
  }, [days, dateId]);

  useEffect(() => { void refreshSchedule(); void refreshCourses(); }, [refreshSchedule, refreshCourses]);
  useFocusEffect(useCallback(() => { void load().catch(() => {}); }, [load]));

  const measureChips = useCallback(() => {
    const next: Frame[] = new Array(7);
    let pending = 7;
    chipNodes.current.slice(0, 7).forEach((node, i) => {
      if (!node) { pending -= 1; return; }
      node.measureInWindow((x, y, w, h) => {
        next[i] = { x, y, w, h };
        pending -= 1;
        if (pending === 0) setFrames(frames, next);
      });
    });
  }, [frames]);

  const eventsOn = useCallback((id: string) => weekEvents.filter((e) => toDateId(new Date(e.dueAtMs)) === id), [weekEvents]);
  const dayEvents = useMemo(() => eventsOn(dateId), [eventsOn, dateId]);
  const absences = useMemo(
    () => attendance.filter((a) => a.status === 'absent').map((a) => ({ id: a.id, courseId: a.courseId })),
    [attendance],
  );
  const occurrences = useMemo(() => occurrencesOnDay(patterns, exceptions, dateId), [patterns, exceptions, dateId]);
  const sections = useMemo(
    () => buildDaySections({ occurrences, events: dayEvents, absences, courses }),
    [occurrences, dayEvents, absences, courses],
  );
  const statusByCourse = useMemo(() => new Map(attendance.map((a) => [a.courseId, a.status as AttendanceStatus])), [attendance]);

  const drop = useCallback((eventId: string, dueAtMs: number, chipIndex: number) => {
    const target = days[chipIndex];
    clearHover(hover);
    if (!target || target === dateId) return;
    // Feedback only after the write lands — otherwise a failed reschedule
    // congratulates the user for nothing.
    void updateEvent(eventId, { dueAtMs: moveDueToDay(dueAtMs, target) })
      .then(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        playSound('tick');
        return load();
      })
      .catch(() => {});
  }, [days, dateId, hover, updateEvent, load]);

  const mark = useCallback(async (courseId: string, status: AttendanceStatus) => {
    // Degrade silently like every other write: on failure `attendance` keeps its
    // old value, so the stamp/buttons still show what the database actually holds.
    try {
      await upsertAttendance(courseId, dateId, status);
      setAttendance(await listAttendanceInRange(dateId, dateId));
    } catch {}
  }, [dateId]);

  const d = parseDateId(dateId);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, padding: 16, gap: 14 }}>
      <ScreenBackground />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <BlobBackButton onPress={() => router.back()} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fontFamilies.mono, fontSize: 11, color: colors.ink40, letterSpacing: 2 }}>
            {WEEKDAY_SHORT[d.getDay()]}
          </Text>
          <Text style={{ fontFamily: fontFamilies.heading, fontSize: 18, color: colors.ink }}>{dateId}</Text>
        </View>
        <SquareIconButton
          glyph="+"
          size={40}
          label="add event"
          onPress={() => router.push({ pathname: '/event/[id]', params: { id: 'new', dueAt: dateId } })}
        />
      </View>

      <View onLayout={measureChips} style={{ flexDirection: 'row', gap: 6 }}>
        {days.map((id, i) => (
          <WeekChip
            key={id}
            dateId={id}
            index={i}
            active={id === dateId}
            count={eventsOn(id).length + occurrencesOnDay(patterns, exceptions, id).length}
            hover={hover}
            onLayoutRef={(idx, node) => { chipNodes.current[idx] = node; }}
            onPress={() => setDateId(id)}
          />
        ))}
      </View>
      <Text style={{ fontFamily: fontFamilies.mono, fontSize: 10, color: colors.ink40, textAlign: 'center', marginTop: -6 }}>
        HOLD AN EVENT, THEN DRAG IT ONTO A DAY TO RESCHEDULE
      </Text>

      <ScrollView contentContainerStyle={{ gap: 18, paddingBottom: 120 }} scrollEnabled>
        {sections.length === 0 ? <EmptyState glyph="·" label="nothing planned" /> : null}
        {sections.map((sec) => (
          <View key={sec.key} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontFamily: fontFamilies.mono, fontSize: 11, color: colors.ink40, letterSpacing: 2 }}>{sec.label}</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.ink15 }} />
              <Text style={{ fontFamily: fontFamilies.lcd, fontSize: 10, color: colors.ink40 }}>{sec.rows.length}</Text>
            </View>
            {sec.rows.map((row) => {
              if (row.eventId !== undefined && row.dueAtMs !== undefined) {
                const { eventId, dueAtMs } = row;
                return (
                  <DraggableEvent
                    key={row.key}
                    row={row}
                    nowMs={nowMs}
                    frames={frames}
                    hover={hover}
                    onBegin={measureChips}
                    onDrop={(idx) => drop(eventId, dueAtMs, idx)}
                    onOpen={() => router.push({ pathname: '/event/[id]', params: { id: eventId } })}
                  />
                );
              }
              const courseId = row.courseId;
              const status = sec.key === 'CLASSES' && courseId ? statusByCourse.get(courseId) : undefined;
              const stamp = status ? statusStamp(status) : null;
              return (
                <View key={row.key} style={{
                  backgroundColor: colors.paper2, borderWidth: 1.5, borderColor: colors.ink, borderRadius: radius.md,
                  padding: 12, gap: 8, ...hardShadow,
                }}>
                  <Pressable
                    onPress={courseId ? () => router.push(`/course/${courseId}`) : undefined}
                    accessibilityRole={courseId ? 'button' : undefined}
                    accessibilityLabel={courseId ? `open ${row.title}` : undefined}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                  >
                    <Text style={{ fontFamily: fontFamilies.lcd, fontSize: 15, color: colors.ink, width: 48 }}>
                      {row.startMs !== undefined ? formatTimeOfDay(row.startMs) : '--:--'}
                    </Text>
                    <Text style={{ fontSize: 18 }}>{row.emoji}</Text>
                    <Text numberOfLines={1} style={{ flex: 1, fontFamily: fontFamilies.mono, fontSize: 14, color: colors.ink }}>{row.title}</Text>
                  </Pressable>
                  {sec.key === 'CLASSES' && courseId ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                      {stamp ? <Stamp text={stamp.text} tone={stamp.tone} /> : null}
                      <AttendanceButtons value={status ?? null} onSelect={(next) => mark(courseId, next)} />
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
