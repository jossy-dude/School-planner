import { Text, View } from 'react-native';
import { Course, StudySession } from '@/db/schema';
import { toDateId } from '@/lib/schedule';
import { EmptyState } from '@/ui/primitives';
import { colors, fontFamilies } from '@/ui/tokens';

interface Props { sessions: StudySession[]; courses: Course[]; }

export function SessionHistory({ sessions, courses }: Props) {
  if (sessions.length === 0) {
    return <EmptyState glyph="◴" label="no sessions yet" />;
  }
  const byId = new Map(courses.map((c) => [c.id, c] as const));
  return (
    <View style={{ gap: 8 }}>
      {sessions.map((s) => {
        const course = s.courseId === null ? undefined : byId.get(s.courseId);
        return (
          <View
            key={s.id}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
            accessibilityLabel={`${s.durationMin} minute session`}
          >
            <Text style={{ fontSize: 16 }}>{course?.emoji ?? '📕'}</Text>
            <Text style={{ fontFamily: fontFamilies.lcd, fontSize: 16, color: colors.ink }}>
              {s.durationMin}M
            </Text>
            <Text style={{ fontFamily: fontFamilies.mono, fontSize: 12, color: colors.ink40, marginLeft: 'auto' }}>
              {toDateId(new Date(s.startedAt))}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
