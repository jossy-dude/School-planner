import type { Course } from '@/db/schema';
import type { AttendanceStatus } from '@/features/attendance/logic';
import { statusStamp } from '@/features/attendance/logic';
import { AttendanceButtons } from '@/features/attendance/components/AttendanceButtons';
import type { CalendarFilter, DotEvent } from '@/features/calendar/dots';
import { KIND_GLYPHS, tMinusLabel } from '@/features/events/logic';
import type { Occurrence } from '@/lib/schedule';
import { EmptyState, SquareIconButton, Stamp, TMinusChip } from '@/ui/primitives';
import { colors, fontFamilies, hardShadow } from '@/ui/tokens';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { CellFrame } from './DayCell';

const PANEL_HEIGHT = 380;
const PANEL_MARGIN = 16;
const BACKDROP_ALPHA = 0.35;
const SPRING = { damping: 24, stiffness: 200, mass: 1 };
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export interface DayDetailProps {
  dateId: string;
  sourceFrame: CellFrame | null;
  containerWidth: number;
  containerHeight: number;
  courses: Course[];
  occurrences: Occurrence[];
  events: DotEvent[];
  absences: { id: string; courseId: string | null }[];
  attendance: { courseId: string; status: AttendanceStatus }[];
  filters: readonly CalendarFilter[];
  onClose: () => void;
  onMarkAttendance?: (courseId: string, date: string, status: AttendanceStatus) => void;
}

interface DetailRow {
  key: string;
  time: string;
  emoji: string;
  title: string;
  courseId?: string | null;
  // Event rows (EXAMS/TASKS/CLUBS) carry their id + due time: they render a
  // T-minus chip instead of the clock slot and open the edit modal on press.
  eventId?: string;
  dueAtMs?: number;
}

interface DetailSection {
  key: string;
  label: string;
  rows: DetailRow[];
}

function hhmm(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

function weekdayOf(dateId: string): string {
  const [y, m, d] = dateId.split('-').map(Number);
  if (y === undefined || m === undefined || d === undefined) return '';
  return WEEKDAYS[new Date(y, m - 1, d).getDay()] ?? '';
}

export function DayDetail({
  dateId,
  sourceFrame,
  containerWidth,
  containerHeight,
  courses,
  occurrences,
  events,
  absences,
  attendance,
  filters,
  onClose,
  onMarkAttendance,
}: DayDetailProps) {
  const target = useMemo(() => {
    const width = Math.max(0, containerWidth - PANEL_MARGIN * 2);
    const maxY = Math.max(PANEL_MARGIN, containerHeight - PANEL_HEIGHT - PANEL_MARGIN);
    const y = sourceFrame
      ? Math.min(Math.max(sourceFrame.y, PANEL_MARGIN), maxY)
      : Math.max(PANEL_MARGIN, Math.min(containerHeight / 4, maxY));
    return { x: PANEL_MARGIN, y, width, height: PANEL_HEIGHT };
  }, [containerWidth, containerHeight, sourceFrame]);

  // Falls back to a neutral top-origin frame when the cell could not be measured.
  const start = useMemo(
    () => sourceFrame ?? { x: target.x, y: target.y, width: target.width, height: 120 },
    [sourceFrame, target],
  );

  const x = useSharedValue(start.x);
  const y = useSharedValue(start.y);
  const w = useSharedValue(start.width);
  const h = useSharedValue(start.height);
  const alpha = useSharedValue(sourceFrame ? 1 : 0);
  const backdrop = useSharedValue(0);

  // All shared-value writes live in this single effect: the immutability lint
  // forbids mutating effect-captured values from event handlers.
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (closing) {
      backdrop.value = withTiming(0, { duration: 150 });
      alpha.value = withSpring(0, SPRING);
      x.value = withSpring(start.x, SPRING, (finished) => {
        if (finished) runOnJS(onClose)();
      });
      y.value = withSpring(start.y, SPRING);
      w.value = withSpring(start.width, SPRING);
      h.value = withSpring(start.height, SPRING);
      return;
    }
    x.value = withSpring(target.x, SPRING);
    y.value = withSpring(target.y, SPRING);
    w.value = withSpring(target.width, SPRING);
    h.value = withSpring(target.height, SPRING);
    alpha.value = withSpring(1, SPRING);
    backdrop.value = withTiming(BACKDROP_ALPHA, { duration: 200 });
  }, [closing, target, start, onClose, x, y, w, h, alpha, backdrop]);

  // T-minus chips tick once a minute — the label bands are minute-granular.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const close = () => setClosing(true);

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
    width: w.value,
    height: h.value,
    opacity: alpha.value,
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  const statusByCourse = useMemo(() => {
    const m = new Map<string, AttendanceStatus>();
    for (const row of attendance) m.set(row.courseId, row.status);
    return m;
  }, [attendance]);

  const sections = useMemo<DetailSection[]>(() => {
    const all = filters.length === 0;
    const want = (f: CalendarFilter) => all || filters.includes(f);
    const course = (id?: string | null) => (id ? courses.find((c) => c.id === id) : undefined);
    const out: DetailSection[] = [];
    // Event rows sort by dueAt and carry the kind glyph; at render they swap the
    // clock slot for a T-minus chip, which is what makes them read as events.
    const eventRows = (pick: (e: DotEvent) => boolean, fallbackTitle: string): DetailRow[] =>
      events
        .filter(pick)
        .sort((a, b) => a.dueAtMs - b.dueAtMs)
        .map((e) => ({
          key: e.id,
          time: hhmm(e.dueAtMs),
          emoji: KIND_GLYPHS[e.kind],
          title: e.title ?? fallbackTitle,
          courseId: e.courseId,
          eventId: e.id,
          dueAtMs: e.dueAtMs,
        }));
    if (want('CLASSES')) {
      out.push({
        key: 'CLASSES',
        label: 'CLASSES',
        rows: occurrences.map((o) => {
          const c = course(o.courseId);
          return { key: o.id, time: hhmm(o.startMs), emoji: c?.emoji ?? '📘', title: c?.name ?? 'CLASS', courseId: o.courseId };
        }),
      });
    }
    if (want('EXAMS')) {
      out.push({
        key: 'EXAMS',
        label: 'EXAMS',
        rows: eventRows((e) => e.kind === 'test' || e.kind === 'quiz', 'EXAM'),
      });
    }
    if (want('TASKS')) {
      out.push({
        key: 'TASKS',
        label: 'TASKS',
        rows: eventRows((e) => e.kind === 'assignment' && !e.done, 'TASK'),
      });
    }
    if (want('CLUBS')) {
      out.push({
        key: 'CLUBS',
        label: 'CLUBS',
        rows: eventRows((e) => e.kind === 'club', 'CLUB'),
      });
    }
    if (absences.length > 0) {
      out.push({
        key: 'ABSENT',
        label: 'ABSENT',
        rows: absences.map((a) => {
          const c = course(a.courseId);
          return { key: `abs:${a.id}`, time: '--:--', emoji: c?.emoji ?? '📘', title: c?.name ?? 'CLASS', courseId: a.courseId };
        }),
      });
    }
    return out;
  }, [filters, occurrences, events, absences, courses]);

  const empty = sections.every((s) => s.rows.length === 0);

  return (
    <>
      <Animated.View style={[{
        position: 'absolute',
        left: 0,
        top: 0,
        width: containerWidth,
        height: containerHeight,
        backgroundColor: colors.ink,
      }, backdropStyle]}>
        <Pressable onPress={close} style={{ flex: 1 }} />
      </Animated.View>
      <Animated.View style={[{
        position: 'absolute',
        left: 0,
        top: 0,
        backgroundColor: colors.paper,
        borderWidth: 2,
        borderColor: colors.ink,
        overflow: 'hidden',
        ...hardShadow,
      }, panelStyle]}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 12,
          paddingTop: 10,
          paddingBottom: 8,
          borderBottomWidth: 2,
          borderBottomColor: colors.ink,
        }}>
          <View style={{ gap: 2 }}>
            <Text style={{ fontFamily: fontFamilies.mono, fontSize: 11, color: colors.ink40, letterSpacing: 2 }}>
              {weekdayOf(dateId)}
            </Text>
            <Text style={{ fontFamily: fontFamilies.heading, fontSize: 16, color: colors.ink }}>
              {dateId}
            </Text>
          </View>
          <SquareIconButton glyph="✕" size={30} onPress={close} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 12, gap: 14, paddingBottom: 20 }}>
          {sections.map((sec) => (
            <View key={sec.key} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontFamily: fontFamilies.mono, fontSize: 11, color: colors.ink40, letterSpacing: 2 }}>
                  {sec.label}
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.ink15 }} />
                <Text style={{ fontFamily: fontFamilies.lcd, fontSize: 10, color: colors.ink40 }}>
                  {sec.rows.length}
                </Text>
              </View>
              {sec.rows.map((row) => {
                const courseId = row.courseId;
                const eventId = row.eventId;
                const dueAtMs = row.dueAtMs;
                const markable = sec.key === 'CLASSES' && !!courseId && !!onMarkAttendance;
                const status = markable && courseId ? statusByCourse.get(courseId) : undefined;
                const stamp = status ? statusStamp(status) : null;
                if (eventId !== undefined && dueAtMs !== undefined) {
                  const label = tMinusLabel(dueAtMs, nowMs);
                  return (
                    <Pressable
                      key={row.key}
                      onPress={() => router.push({ pathname: '/event/[id]', params: { id: eventId } })}
                      accessibilityRole="button"
                      accessibilityLabel={`edit ${row.title}`}
                      hitSlop={4}
                      style={({ pressed }) => [{
                        flexDirection: 'row', alignItems: 'center', gap: 10, opacity: pressed ? 0.6 : 1,
                      }]}
                    >
                      <TMinusChip text={label} tone={label === 'OVERDUE' ? 'danger' : 'ink'} />
                      <Text style={{ fontSize: 16 }}>{row.emoji}</Text>
                      <Text numberOfLines={1} style={{ flex: 1, fontFamily: fontFamilies.mono, fontSize: 13, color: colors.ink }}>
                        {row.title}
                      </Text>
                    </Pressable>
                  );
                }
                return (
                  <View key={row.key} style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={{ fontFamily: fontFamilies.lcd, fontSize: 15, color: colors.ink, width: 48 }}>
                        {row.time}
                      </Text>
                      <Text style={{ fontSize: 16 }}>{row.emoji}</Text>
                      <Text numberOfLines={1} style={{ flex: 1, fontFamily: fontFamilies.mono, fontSize: 13, color: colors.ink }}>
                        {row.title}
                      </Text>
                    </View>
                    {markable && courseId && onMarkAttendance ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                        {stamp ? <Stamp text={stamp.text} tone={stamp.tone} /> : null}
                        <AttendanceButtons
                          value={status ?? null}
                          onSelect={(next) => onMarkAttendance(courseId, dateId, next)}
                        />
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ))}
          {empty ? <EmptyState glyph="·" label="nothing planned" /> : null}
        </ScrollView>
      </Animated.View>
    </>
  );
}
