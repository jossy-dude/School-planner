import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useCoursesStore } from '@/features/courses/store';
import { WEEKDAY_SHORT } from '@/features/schedule/logic';
import { nextActiveOccurrence } from '@/features/schedule/selectors';
import { useScheduleStore } from '@/features/schedule/store';
import { useSettingsStore } from '@/features/settings/store';
import { formatClock, formatCountdown, formatDurationMin, formatTimeOfDay } from '@/lib/format';
import { toDateId } from '@/lib/schedule';
import { BrutCard } from '@/ui/BrutCard';
import { DotArcClock } from '@/ui/DotArcClock';
import { PixelReveal } from '@/ui/PixelReveal';
import { EmptyState, Stamp, TMinusChip } from '@/ui/primitives';
import { TickBar } from '@/ui/tickbar';
import { colors, fontFamilies, radius } from '@/ui/tokens';

const sectionTitleStyle = {
  fontFamily: fontFamilies.heading, fontSize: 12, color: colors.ink40, letterSpacing: 2, marginBottom: 6,
} as const;

function QuickAction({ glyph, label, onPress }: { glyph: string; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        borderWidth: 2, borderColor: colors.ink, borderRadius: radius.md, paddingVertical: 12,
        backgroundColor: colors.ink,
      }}
    >
      <Text style={{ fontSize: 14 }}>{glyph}</Text>
      <Text style={{ fontFamily: fontFamilies.heading, fontSize: 12, color: colors.paper, letterSpacing: 0.5 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function HeroCardBody() {
  const patterns = useScheduleStore((s) => s.patterns);
  const exceptions = useScheduleStore((s) => s.exceptions);
  const refreshSchedule = useScheduleStore((s) => s.refresh);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const courses = useCoursesStore((s) => s.courses);
  const refreshCourses = useCoursesStore((s) => s.refresh);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    void refreshSchedule();
    void hydrateSettings();
    void refreshCourses();
  }, [refreshSchedule, hydrateSettings, refreshCourses]);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { current, next } = nextActiveOccurrence({ patterns, exceptions }, nowMs);
  const occ = current ?? next;

  if (!occ) {
    return (
      <BrutCard>
        <Text style={sectionTitleStyle}>NOW</Text>
        <EmptyState glyph="◷" label="no class today — enjoy the free time" />
      </BrutCard>
    );
  }

  const active = current !== null;
  const course = courses.find((c) => c.id === occ.courseId);
  const remaining = active
    ? Math.max(0, occ.endMs - nowMs)
    : Math.max(0, occ.startMs - nowMs);
  const totalMs = active ? occ.endMs - occ.startMs : remaining;
  const span = Math.max(1, occ.endMs - occ.startMs);
  const progress = active ? Math.min(1, Math.max(0, (nowMs - occ.startMs) / span)) : 0;
  const durationMin = Math.round((occ.endMs - occ.startMs) / 60_000);
  const isToday = occ.dateId === toDateId(new Date(nowMs));
  const dayPrefix = isToday ? '' : `${WEEKDAY_SHORT[new Date(occ.startMs).getDay()] ?? ''} `;

  return (
    <BrutCard onPress={() => router.push(`/course/${occ.courseId}`)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <Text style={{ fontSize: 24, color: colors.ink }}>{course?.emoji ?? '📘'}</Text>
          <Text numberOfLines={1} style={{ fontFamily: fontFamilies.mono, fontSize: 16, color: colors.ink, flexShrink: 1 }}>
            {course?.name ?? 'CLASS'}
          </Text>
        </View>
        <Stamp text={active ? 'ACTIVE' : 'UP NEXT'} />
      </View>

      <Text style={{ fontFamily: fontFamilies.mono, fontSize: 12, color: colors.ink70, marginBottom: 10 }}>
        {dayPrefix}{formatTimeOfDay(occ.startMs)}–{formatTimeOfDay(occ.endMs)} · {formatDurationMin(durationMin)}
      </Text>

      <View style={{ alignItems: 'center', marginVertical: 4 }}>
        <DotArcClock remainingMs={remaining} totalMs={totalMs} label={formatClock(remaining)} />
      </View>

      <View style={{ alignItems: 'center', marginTop: 10, marginBottom: 14 }}>
        {active
          ? <TickBar progress={progress} size="lg" />
          : <TMinusChip text={formatCountdown(remaining)} />}
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <QuickAction
          glyph="▶"
          label="start focus timer"
          onPress={() => router.push({ pathname: '/(tabs)/timer', params: { courseId: occ.courseId } })}
        />
      </View>
    </BrutCard>
  );
}

// The staggered pixel-dissolve intro plays once, the first time this card
// mounts (i.e. when the app loads onto the Today tab) — it does not replay
// on every focus, since expo-router keeps tab screens mounted across switches.
export function HeroCard() {
  return (
    <PixelReveal>
      <HeroCardBody />
    </PixelReveal>
  );
}
