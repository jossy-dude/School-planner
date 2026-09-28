import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { router } from 'expo-router';
import { useCoursesStore } from '@/features/courses/store';
import { todayOccurrences } from '@/features/schedule/selectors';
import { useScheduleStore } from '@/features/schedule/store';
import { formatTimeOfDay } from '@/lib/format';
import { BrutCard } from '@/ui/BrutCard';
import { colors, fontFamilies, radius } from '@/ui/tokens';
import { agendaState } from '../logic';

// Every class today at a glance: finished ones fade, the running one is filled.
export function AgendaStrip() {
  const patterns = useScheduleStore((s) => s.patterns);
  const exceptions = useScheduleStore((s) => s.exceptions);
  const courses = useCoursesStore((s) => s.courses);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const occs = todayOccurrences({ patterns, exceptions }, nowMs);
  return (
    <BrutCard>
      <Text style={{ fontFamily: fontFamilies.heading, fontSize: 12, color: colors.ink40, letterSpacing: 2, marginBottom: 8 }}>
        TODAY&apos;S CLASSES
      </Text>
      {occs.length === 0 && (
        <Text style={{ fontFamily: fontFamilies.mono, fontSize: 12, color: colors.ink40 }}>no classes today</Text>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {occs.map((o) => {
          const state = agendaState(o, nowMs);
          const course = courses.find((c) => c.id === o.courseId);
          const now = state === 'now';
          return (
            <Pressable
              key={o.id}
              onPress={() => router.push(`/course/${o.courseId}`)}
              accessibilityRole="button"
              accessibilityLabel={`${course?.name ?? 'class'} at ${formatTimeOfDay(o.startMs)}`}
              style={{
                minWidth: 96, padding: 10, gap: 4, borderWidth: 1.5, borderColor: colors.ink,
                borderRadius: radius.md, backgroundColor: now ? colors.ink : colors.paper,
                opacity: state === 'past' ? 0.45 : 1,
              }}
            >
              <Text style={{ fontFamily: fontFamilies.lcd, fontSize: 13, color: now ? colors.paper : colors.ink }}>
                {formatTimeOfDay(o.startMs)}
              </Text>
              <Text style={{ fontSize: 18 }}>{course?.emoji ?? '📘'}</Text>
              <Text numberOfLines={1} style={{ fontFamily: fontFamilies.mono, fontSize: 11, color: now ? colors.paper : colors.ink70 }}>
                {course?.name ?? 'CLASS'}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </BrutCard>
  );
}
