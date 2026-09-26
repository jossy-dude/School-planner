import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Attendance, Grade, GradeCategory, Pattern } from '@/db/schema';
import { attendanceStats, statusStamp } from '@/features/attendance/logic';
import { listAttendance } from '@/features/attendance/queries';
import { CourseForm } from '@/features/courses/components/CourseForm';
import { PatternTile } from '@/features/courses/components/PatternTile';
import { courseFolderLabel } from '@/features/courses/logic';
import { useCoursesStore } from '@/features/courses/store';
import { CategoryChips } from '@/features/grades/components/CategoryChips';
import { GradeListItem } from '@/features/grades/components/GradeRow';
import { ScoreBar } from '@/features/grades/components/ScoreBar';
import { useGrades } from '@/features/grades/store';
import { NoteList } from '@/features/notes/components/NoteList';
import { useNotes } from '@/features/notes/store';
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

// Rendered-mark cap: the stats above always cover every row, but the list itself
// is bounded so a long term can't produce an unbounded scroll.
const MAX_MARKS_SHOWN = 30;

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
        {recent.slice(0, MAX_MARKS_SHOWN).map((row) => {
          const stamp = statusStamp(row.status);
          return (
            <View key={row.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: fontFamilies.lcd, fontSize: 14, color: colors.ink70 }}>{row.date}</Text>
              <Stamp text={stamp.text} tone={stamp.tone} />
            </View>
          );
        })}
        {recent.length > MAX_MARKS_SHOWN ? (
          <Text style={{ fontFamily: fontFamilies.mono, fontSize: 11, color: colors.ink40 }}>
            {`+${recent.length - MAX_MARKS_SHOWN} earlier`}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function GradesPanel({ courseId }: { courseId: string }) {
  const { categories, grades, finalPct, loaded, refresh, addCategory, removeGrade, removeCategory } = useGrades(courseId);
  useEffect(() => { void refresh(courseId); }, [refresh, courseId]);

  const sorted = useMemo(() => [...grades].sort((a, b) => b.date.localeCompare(a.date)), [grades]);
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const weightSum = categories.reduce((sum, c) => sum + c.weight, 0);
  // Informational only — the engine never requires weights to sum to 100.
  const showWeightStamp = categories.length > 0 && Math.round(weightSum) !== 100;

  const confirmDeleteGrade = (g: Grade) => {
    Alert.alert('Delete grade?', `${g.title} will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { void removeGrade(g.id); } },
    ]);
  };

  const confirmDeleteCategory = (c: GradeCategory) => {
    Alert.alert('Delete category?', `${c.name} will be removed. Grades keep their scores but lose the tag.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { void removeCategory(c.id); } },
    ]);
  };

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: fontFamilies.heading, fontSize: 13, color: colors.ink70 }}>
          Ⓦ GRADES
        </Text>
        <SquareIconButton
          glyph="+"
          size={32}
          onPress={() => router.push({ pathname: '/grade/[id]', params: { id: 'new', courseId } })}
        />
      </View>

      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Text style={{ fontFamily: fontFamilies.lcd, fontSize: 40, color: colors.ink }}>
              {finalPct === null ? '--' : finalPct.toFixed(1)}
            </Text>
            <Text style={{ fontFamily: fontFamilies.mono, fontSize: 14, color: colors.ink40 }}>%</Text>
          </View>
          {showWeightStamp && <Stamp text="WEIGHTS ≠100" tone="danger" />}
        </View>
        <ScoreBar value={(finalPct ?? 0) / 100} />
      </View>

      <CategoryChips
        categories={categories}
        onAdd={(draft) => { void addCategory(draft); }}
        onLongPress={confirmDeleteCategory}
      />

      {sorted.length === 0 ? (
        <EmptyState glyph="Ⓦ" label={loaded ? 'no grades yet' : 'loading…'} />
      ) : (
        <View style={{ gap: 8 }}>
          {sorted.map((g) => (
            <GradeListItem
              key={g.id}
              grade={g}
              category={g.categoryId !== null ? categoryById.get(g.categoryId) : undefined}
              onPress={() => router.push({ pathname: '/grade/[id]', params: { id: g.id, courseId } })}
              onDelete={() => confirmDeleteGrade(g)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function NotesPanel({ courseId }: { courseId: string }) {
  const { notes, loaded, refresh } = useNotes(courseId);
  useEffect(() => { void refresh(courseId); }, [refresh, courseId]);

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: fontFamilies.heading, fontSize: 13, color: colors.ink70 }}>
          ✎ NOTES
        </Text>
        <SquareIconButton
          glyph="+"
          size={32}
          label="add note"
          onPress={() => router.push({ pathname: '/note-edit', params: { id: 'new', courseId } })}
        />
      </View>
      {notes.length === 0 ? (
        <EmptyState glyph="✎" label={loaded ? 'no notes yet' : 'loading…'} />
      ) : (
        <NoteList notes={notes} courseId={courseId} />
      )}
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
      ) : s.key === 'grades' ? (
        <GradesPanel key={s.key} courseId={id} />
      ) : s.key === 'attendance' ? (
        <View key={s.key} style={{ gap: 8 }}>
          <Text style={{ fontFamily: fontFamilies.heading, fontSize: 13, color: colors.ink70 }}>
            {s.glyph} {s.title}
          </Text>
          <AttendancePanel rows={attendanceRows} />
        </View>
      ) : s.key === 'notes' ? (
        <NotesPanel key={s.key} courseId={id} />
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
