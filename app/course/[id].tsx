import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Attendance, Pattern } from '@/db/schema';
import { attendanceStats, statusStamp } from '@/features/attendance/logic';
import { listAttendance } from '@/features/attendance/queries';
import { CourseForm } from '@/features/courses/components/CourseForm';
import { PatternTile } from '@/features/courses/components/PatternTile';
import { courseFolderLabel } from '@/features/courses/logic';
import { useCoursesStore } from '@/features/courses/store';
import { PatternRow } from '@/features/schedule/components/PatternRow';
import { useSchedule } from '@/features/schedule/store';
import { EmptyState, SquareIconButton, Stamp } from '@/ui/primitives';
import { colors, fontFamilies, hardShadow, radius } from '@/ui/tokens';

const SECTIONS = [
  { key: 'schedule', glyph: '◷', title: 'SCHEDULE' },
  { key: 'grades', glyph: 'Ⓦ', title: 'GRADES' },
  { key: 'notes', glyph: '✎', title: 'NOTES' },
  { key: 'files', glyph: '▤', title: 'FILES' },
  { key: 'attendance', glyph: '◌', title: 'ATTENDANCE' },
] as const;

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
      <Text style={{ fontFamily: fontFamilies.mono, fontSize: 11, color: colors.ink40 }}>{label}</Text>
      <Text style={{ fontFamily: fontFamilies.lcd, fontSize: 16, color: colors.ink }}>{value}</Text>
    </View>
  );
}

function AttendancePanel({ rows }: { rows: Attendance[] }) {
  const stats = useMemo(() => attendanceStats(rows), [rows]);
  const recent = useMemo(() => [...rows].sort((a, b) => b.date.localeCompare(a.date)), [rows]);
  if (rows.length === 0) return <EmptyState glyph="◌" label="not marked yet" />;
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <Stat label="P" value={stats.present} />
          <Stat label="A" value={stats.absent} />
          <Stat label="L" value={stats.late} />
          <Stat label="E" value={stats.excused} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
          <Text style={{ fontFamily: fontFamilies.lcd, fontSize: 22, color: colors.ink }}>
            {Math.round(stats.rate * 100)}
          </Text>
          <Text style={{ fontFamily: fontFamilies.mono, fontSize: 13, color: colors.ink40 }}>%</Text>
        </View>
      </View>
      <View style={{ gap: 6 }}>
        {recent.map((row) => {
          const stamp = statusStamp(row.status);
          return (
            <View key={row.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: fontFamilies.lcd, fontSize: 14, color: colors.ink70 }}>{row.date}</Text>
              <Stamp text={stamp.text} tone={stamp.tone} />
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function CourseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { courses, loaded, refresh, remove } = useCoursesStore();
  const { patterns, exceptions, refresh: refreshSchedule, removePattern } = useSchedule(id);
  const [editing, setEditing] = useState(false);
  const [attendanceRows, setAttendanceRows] = useState<Attendance[]>([]);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { refreshSchedule(); }, [refreshSchedule]);
  useEffect(() => {
    if (id === 'new') return;
    let alive = true;
    void listAttendance(id)
      .then((rows) => { if (alive) setAttendanceRows(rows); })
      .catch(() => {});
    return () => { alive = false; };
  }, [id]);

  if (id === 'new') return <CourseForm mode="create" />;

  const course = courses.find((c) => c.id === id);

  if (!course) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, padding: 16, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <SquareIconButton glyph="←" onPress={() => router.back()} size={40} />
          <Text style={{ fontFamily: fontFamilies.heading, fontSize: 16, color: colors.ink }}>COURSE</Text>
        </View>
        <EmptyState glyph="▣" label={loaded ? 'course not found' : 'loading…'} />
      </View>
    );
  }

  if (editing) {
    return <CourseForm mode="edit" course={course} />;
  }

  const confirmDelete = () => {
    Alert.alert('Delete course?', `${courseFolderLabel(course)} will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await remove(course.id);
          router.back();
        },
      },
    ]);
  };

  const confirmDeletePattern = (p: Pattern) => {
    Alert.alert('Delete pattern?', `${p.startTime}–${p.endTime} will be removed from the schedule.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removePattern(p.id) },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.paper }} contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <SquareIconButton glyph="←" onPress={() => router.back()} size={40} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <SquareIconButton glyph="✎" onPress={() => setEditing(true)} size={40} />
          <SquareIconButton glyph="✕" tone="danger" onPress={confirmDelete} size={40} />
        </View>
      </View>

      <View style={{ borderWidth: 2, borderColor: colors.ink, borderRadius: radius.md, backgroundColor: colors.paper2, overflow: 'hidden', ...hardShadow }}>
        <PatternTile color={course.color} pattern={course.pattern} height={88} />
        <View style={{ padding: 12, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 30 }}>{course.emoji}</Text>
            <Text style={{ flex: 1, fontFamily: fontFamilies.heading, fontSize: 18, color: colors.ink }}>
              {courseFolderLabel(course)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Text style={{ fontFamily: fontFamilies.mono, fontSize: 12, color: colors.ink70 }}>
              CODE {course.code || '—'}
            </Text>
            <Text style={{ fontFamily: fontFamilies.lcd, fontSize: 13, color: colors.ink70 }}>
              {course.credits}CR
            </Text>
            <Text style={{ fontFamily: fontFamilies.lcd, fontSize: 13, color: colors.ink70 }}>
              {course.defaultDurationMin}MIN
            </Text>
          </View>
        </View>
      </View>

      {SECTIONS.map((s) => (s.key === 'schedule' ? (
        <View key={s.key} style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: fontFamilies.heading, fontSize: 13, color: colors.ink70 }}>
              {s.glyph} {s.title}
            </Text>
            <SquareIconButton
              glyph="+"
              size={32}
              onPress={() => router.push({ pathname: '/schedule-edit', params: { courseId: id } })}
            />
          </View>
          {patterns.length === 0 && exceptions.length === 0 ? (
            <EmptyState glyph={s.glyph} label="nothing here yet" />
          ) : (
            <View style={{ gap: 8 }}>
              {patterns.map((p) => (
                <PatternRow
                  key={p.id}
                  pattern={p}
                  onPress={() => router.push({ pathname: '/schedule-edit', params: { courseId: id, patternId: p.id } })}
                  onDelete={() => confirmDeletePattern(p)}
                />
              ))}
              {exceptions.length > 0 && (
                <View style={{ gap: 6 }}>
                  <Text style={{ fontFamily: fontFamilies.mono, fontSize: 11, color: colors.ink40, letterSpacing: 1 }}>
                    EXCEPTIONS
                  </Text>
                  {exceptions.map((e) => (
                    <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={{ fontFamily: fontFamilies.mono, fontSize: 13, color: colors.ink70 }}>
                        {e.date}
                      </Text>
                      <Stamp
                        text={e.kind === 'cancelled' ? 'CANCELLED' : 'EXTRA'}
                        tone={e.kind === 'cancelled' ? 'danger' : 'ink'}
                      />
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      ) : s.key === 'attendance' ? (
        <View key={s.key} style={{ gap: 8 }}>
          <Text style={{ fontFamily: fontFamilies.heading, fontSize: 13, color: colors.ink70 }}>
            {s.glyph} {s.title}
          </Text>
          <AttendancePanel rows={attendanceRows} />
        </View>
      ) : (
        <View key={s.key} style={{ gap: 4 }}>
          <Text style={{ fontFamily: fontFamilies.heading, fontSize: 13, color: colors.ink70 }}>
            {s.glyph} {s.title}
          </Text>
          <EmptyState glyph={s.glyph} label="nothing here yet" />
        </View>
      )))}
    </ScrollView>
  );
}
