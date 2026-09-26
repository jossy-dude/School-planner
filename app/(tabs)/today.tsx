import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import type { Attendance } from '@/db/schema';
import { WeekGauge } from '@/features/attendance/components/WeekGauge';
import { isAttended, weekStartId } from '@/features/attendance/logic';
import { listWeekAttendance } from '@/features/attendance/queries';
import { weekOccurrences } from '@/features/schedule/selectors';
import { useScheduleStore } from '@/features/schedule/store';
import { useSettings, useSettingsStore } from '@/features/settings/store';
import { HeroCard } from '@/features/today/components/HeroCard';
import { toDateId } from '@/lib/schedule';
import { BrutCard } from '@/ui/BrutCard';
import { EmptyState, SquareIconButton } from '@/ui/primitives';
import { colors, fontFamilies } from '@/ui/tokens';

const GAUGE_REFRESH_MS = 30_000;

function Section({ title, glyph, label }: { title: string; glyph: string; label: string }) {
  return (
    <BrutCard>
      <Text style={{ fontFamily: fontFamilies.heading, fontSize: 12, color: colors.ink40, letterSpacing: 2, marginBottom: 6 }}>
        {title}
      </Text>
      <EmptyState glyph={glyph} label={label} />
    </BrutCard>
  );
}

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
      <Text style={{ fontFamily: fontFamilies.heading, fontSize: 12, color: colors.ink40, letterSpacing: 2, marginBottom: 6 }}>
        ATTENDANCE
      </Text>
      <WeekGauge sessions={occurrences.length} attended={attended} />
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
        <Section title="PROMISES" glyph="✓" label="no promises yet" />
        <Section title="DUE" glyph="✎" label="nothing due" />
        <AttendanceSection />
      </ScrollView>
    </View>
  );
}
