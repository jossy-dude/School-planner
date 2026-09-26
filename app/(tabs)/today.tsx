import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';
import type { Attendance, StudyPromise } from '@/db/schema';
import { WeekGauge } from '@/features/attendance/components/WeekGauge';
import { isAttended, weekStartId } from '@/features/attendance/logic';
import { listWeekAttendance } from '@/features/attendance/queries';
import { useCoursesStore } from '@/features/courses/store';
import { TicketCard } from '@/features/events/components/TicketCard';
import { useEventsStore } from '@/features/events/store';
import { usePromisesStore } from '@/features/promises/store';
import { weekOccurrences } from '@/features/schedule/selectors';
import { useScheduleStore } from '@/features/schedule/store';
import { useSettings, useSettingsStore } from '@/features/settings/store';
import { SubjectPicker } from '@/features/timer/components/SubjectPicker';
import { HeroCard } from '@/features/today/components/HeroCard';
import { PromiseBar } from '@/features/today/components/PromiseBar';
import { toDateId } from '@/lib/schedule';
import { BrutCard } from '@/ui/BrutCard';
import { EmptyState, SegmentedChips, SquareIconButton } from '@/ui/primitives';
import { colors, fontFamilies, radius } from '@/ui/tokens';

const GAUGE_REFRESH_MS = 30_000;

const sectionTitleStyle = {
  fontFamily: fontFamilies.heading, fontSize: 12, color: colors.ink40, letterSpacing: 2, marginBottom: 6,
} as const;

const fieldLabel = {
  fontFamily: fontFamilies.mono, fontSize: 11, color: colors.ink40, letterSpacing: 1,
} as const;

const fieldBox = {
  borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.paper,
  borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10,
  fontFamily: fontFamilies.body, fontSize: 16, color: colors.ink,
} as const;

function AttendanceSection() {
  const patterns = useScheduleStore((s) => s.patterns);
  const exceptions = useScheduleStore((s) => s.exceptions);
  const refreshSchedule = useScheduleStore((s) => s.refresh);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const { week_start } = useSettings();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [rows, setRows] = useState<Attendance[]>([]);

  useEffect(() => {
    void refreshSchedule();
    void hydrateSettings();
  }, [refreshSchedule, hydrateSettings]);

  const load = useCallback(async () => {
    const startId = weekStartId(toDateId(new Date()), week_start);
    const next = await listWeekAttendance(startId);
    setRows(next);
    setNowMs(Date.now());
  }, [week_start]);

  useFocusEffect(
    useCallback(() => {
      void load().catch(() => {});
      const timer = setInterval(() => { void load().catch(() => {}); }, GAUGE_REFRESH_MS);
      return () => clearInterval(timer);
    }, [load]),
  );

  const occurrences = useMemo(
    () => weekOccurrences({ patterns, exceptions }, nowMs, week_start),
    [patterns, exceptions, nowMs, week_start],
  );

  const attended = useMemo(() => {
    const byKey = new Map(rows.map((row) => [`${row.courseId}|${row.date}`, row.status] as const));
    return occurrences.filter((occ) => {
      const status = byKey.get(`${occ.courseId}|${occ.dateId}`);
      return status !== undefined && isAttended(status);
    }).length;
  }, [occurrences, rows]);

  return (
    <BrutCard>
      <Text style={sectionTitleStyle}>
        ATTENDANCE
      </Text>
      <WeekGauge sessions={occurrences.length} attended={attended} />
    </BrutCard>
  );
}

function DueSection() {
  const refreshEvents = useEventsStore((s) => s.refresh);
  // useShallow: upcoming() returns a fresh array, and zustand v5 hands the raw
  // selector snapshot to React's useSyncExternalStore — an uncached array loops forever.
  const due = useEventsStore(useShallow((s) => s.upcoming(3)));
  const [nowMs, setNowMs] = useState(() => Date.now());

  // T-minus bands are minute-granular (HeroCard's 1s tick drives a seconds clock, this doesn't).
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Refocus reloads (event modal closed, tab switched), mirroring AttendanceSection.
  useFocusEffect(
    useCallback(() => {
      void refreshEvents().catch(() => {});
    }, [refreshEvents]),
  );

  return (
    <BrutCard>
      <Text style={sectionTitleStyle}>
        DUE
      </Text>
      {due.length === 0 ? (
        <EmptyState glyph="◆" label="nothing due" />
      ) : (
        <View style={{ gap: 12 }}>
          {due.map((event) => (
            <TicketCard key={event.id} event={event} nowMs={nowMs} />
          ))}
        </View>
      )}
    </BrutCard>
  );
}

const stepTarget = (current: number, dir: 1 | -1): number =>
  Math.min(240, Math.max(15, current + dir * 15));

function PromisesSection() {
  const { week_start } = useSettings();
  const promises = usePromisesStore((s) => s.promises);
  const sessions = usePromisesStore((s) => s.sessions);
  const refreshPromises = usePromisesStore((s) => s.refresh);
  const addPromise = usePromisesStore((s) => s.add);
  const removePromise = usePromisesStore((s) => s.remove);
  const courses = useCoursesStore((s) => s.courses);
  const refreshCourses = useCoursesStore((s) => s.refresh);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [adding, setAdding] = useState(false);
  const [subject, setSubject] = useState('');
  const [targetMin, setTargetMin] = useState(60);
  const [period, setPeriod] = useState<'day' | 'week'>('day');
  const [courseId, setCourseId] = useState<string | null>(null);

  useEffect(() => {
    void refreshCourses().catch(() => {});
    void hydrateSettings().catch(() => {});
  }, [refreshCourses, hydrateSettings]);

  // Refocus reloads promises + sessions and re-anchors the window clock
  // (no interval: progress is minute-granular at best — disclosed).
  const load = useCallback(async () => {
    await refreshPromises(week_start);
    setNowMs(Date.now());
  }, [refreshPromises, week_start]);

  useFocusEffect(
    useCallback(() => {
      void load().catch(() => {});
    }, [load]),
  );

  const closeAdd = () => {
    setAdding(false);
    setSubject('');
    setTargetMin(60);
    setPeriod('day');
    setCourseId(null);
  };

  const submit = async () => {
    const trimmed = subject.trim();
    if (trimmed.length === 0) return;
    try {
      await addPromise({ courseId, subject: trimmed, targetMin, period });
      closeAdd();
      setNowMs(Date.now());
    } catch {
      // Keep the form open; the next focus reload retries.
    }
  };

  const confirmDelete = (promise: StudyPromise) => {
    Alert.alert('Delete promise?', `${promise.subject} will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => { void removePromise(promise.id).catch(() => {}); },
      },
    ]);
  };

  return (
    <BrutCard>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <Text style={sectionTitleStyle}>PROMISES</Text>
        <SquareIconButton
          glyph="+"
          size={32}
          label="add promise"
          active={adding}
          onPress={() => (adding ? closeAdd() : setAdding(true))}
        />
      </View>

      {adding && (
        <View style={{ gap: 10, marginBottom: 12 }}>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="e.g. Maths"
            placeholderTextColor={colors.ink40}
            style={fieldBox}
            autoCapitalize="sentences"
            accessibilityLabel="promise subject"
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <SquareIconButton
              glyph="−"
              size={32}
              label="decrease target minutes"
              onPress={() => setTargetMin((t) => stepTarget(t, -1))}
            />
            <View style={{
              minWidth: 76, borderWidth: 2, borderColor: colors.ink, borderRadius: radius.sm,
              backgroundColor: colors.paper, paddingVertical: 8, alignItems: 'center',
            }}>
              <Text style={{ fontFamily: fontFamilies.lcd, fontSize: 16, color: colors.ink }}>
                {targetMin}
              </Text>
            </View>
            <SquareIconButton
              glyph="+"
              size={32}
              label="increase target minutes"
              onPress={() => setTargetMin((t) => stepTarget(t, 1))}
            />
            <Text style={fieldLabel}>MIN</Text>
          </View>
          <SegmentedChips
            options={['DAY', 'WEEK']}
            value={period.toUpperCase()}
            onChange={(v) => setPeriod(v === 'WEEK' ? 'week' : 'day')}
          />
          <SubjectPicker courses={courses} selectedId={courseId} onSelect={setCourseId} disabled={false} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={() => void submit()}
              disabled={subject.trim().length === 0}
              accessibilityRole="button"
              accessibilityLabel="save promise"
              style={{
                flex: 1, backgroundColor: colors.ink, borderWidth: 2, borderColor: colors.ink,
                paddingVertical: 12, alignItems: 'center', borderRadius: radius.md,
                opacity: subject.trim().length === 0 ? 0.4 : 1,
              }}
            >
              <Text style={{ fontFamily: fontFamilies.heading, fontSize: 13, color: colors.paper }}>ADD</Text>
            </Pressable>
            <SquareIconButton glyph="✕" size={44} label="cancel add promise" onPress={closeAdd} />
          </View>
        </View>
      )}

      {promises.length === 0 ? (
        <EmptyState glyph="◔" label="no promises — set one" />
      ) : (
        <View style={{ gap: 14 }}>
          {promises.map((promise) => (
            <PromiseBar
              key={promise.id}
              promise={promise}
              sessions={sessions}
              nowMs={nowMs}
              weekStart={week_start}
              emoji={promise.courseId ? courses.find((c) => c.id === promise.courseId)?.emoji : undefined}
              onLongPress={() => confirmDelete(promise)}
            />
          ))}
        </View>
      )}
    </BrutCard>
  );
}

export default function TodayScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, padding: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontFamily: fontFamilies.heading, fontSize: 18, color: colors.ink }}>TODAY</Text>
        <SquareIconButton glyph="⚙" onPress={() => router.push('/settings')} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 16 }}>
        <HeroCard />
        <PromisesSection />
        <DueSection />
        <AttendanceSection />
      </ScrollView>
    </View>
  );
}
