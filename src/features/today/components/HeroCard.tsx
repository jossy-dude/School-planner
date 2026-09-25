import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useCoursesStore } from '@/features/courses/store';
import { formatClock, formatCountdown } from '@/lib/format';
import { nextActiveOccurrence } from '@/features/schedule/selectors';
import { useScheduleStore } from '@/features/schedule/store';
import { useSettingsStore } from '@/features/settings/store';
import { BrutCard } from '@/ui/BrutCard';
import { DotArcClock } from '@/ui/DotArcClock';
import { EmptyState, Stamp, TMinusChip } from '@/ui/primitives';
import { TickBar } from '@/ui/tickbar';
import { colors, fontFamilies } from '@/ui/tokens';

export function HeroCard() {
  const patterns = useScheduleStore((s) => s.patterns);
  const exceptions = useScheduleStore((s) => s.exceptions);
  const refreshSchedule = useScheduleStore((s) => s.refresh);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const courses = useCoursesStore((s) => s.courses);
  const refreshCourses = useCoursesStore((s) => s.refresh);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    refreshSchedule();
    hydrateSettings();
    refreshCourses();
  }, [refreshSchedule, hydrateSettings, refreshCourses]);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { current, next } = nextActiveOccurrence({ patterns, exceptions }, nowMs);
  const occ = current ?? next;
  if (!occ) return <EmptyState glyph="◷" label="no class today" />;

  const active = current !== null;
  const course = courses.find((c) => c.id === occ.courseId);
  const remaining = active
    ? Math.max(0, occ.endMs - nowMs)
    : Math.max(0, occ.startMs - nowMs);
  const totalMs = active ? occ.endMs - occ.startMs : remaining;
  const progress = active ? (nowMs - occ.startMs) / (occ.endMs - occ.startMs) : 0;

  return (
    <BrutCard>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 22, color: colors.ink }}>{course?.emoji ?? '📘'}</Text>
          <Text style={{ fontFamily: fontFamilies.mono, fontSize: 15, color: colors.ink }}>
            {course?.name ?? 'CLASS'}
          </Text>
        </View>
        <Stamp text={active ? 'ACTIVE' : 'STARTS IN'} />
      </View>
      <View style={{ alignItems: 'center', marginVertical: 4 }}>
        <DotArcClock remainingMs={remaining} totalMs={totalMs} label={formatClock(remaining)} />
      </View>
      <View style={{ alignItems: 'center', marginTop: 4 }}>
        {active
          ? <TickBar progress={progress} />
          : <TMinusChip text={formatCountdown(remaining)} />}
      </View>
    </BrutCard>
  );
}
