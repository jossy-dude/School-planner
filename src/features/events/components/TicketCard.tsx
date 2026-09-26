import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SchoolEvent } from '@/db/schema';
import { useCoursesStore } from '@/features/courses/store';
import { BrutCard } from '@/ui/BrutCard';
import { Stamp, TMinusChip } from '@/ui/primitives';
import { colors, fontFamilies } from '@/ui/tokens';
import { tMinusLabel } from '../logic';
import { useEventsStore } from '../store';
import { Chip } from './KindChip';

export function TicketCard({ event, nowMs }: { event: SchoolEvent; nowMs: number }) {
  const courses = useCoursesStore((s) => s.courses);
  const refreshCourses = useCoursesStore((s) => s.refresh);
  const coursesLoaded = useCoursesStore((s) => s.loaded);
  const toggleDone = useEventsStore((s) => s.toggleDone);

  useEffect(() => {
    if (coursesLoaded) return;
    void refreshCourses();
  }, [coursesLoaded, refreshCourses]);

  const course = event.courseId ? courses.find((c) => c.id === event.courseId) : undefined;
  const label = tMinusLabel(event.dueAt.getTime(), nowMs);
  const overdue = label === 'OVERDUE';

  const onToggle = () => {
    void toggleDone(event.id, !event.done).catch(() => {});
  };

  return (
    <BrutCard>
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6,
      }}>
        <TMinusChip text={label} tone={overdue ? 'danger' : 'ink'} />
        <Pressable
          onPress={onToggle}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: event.done }}
          accessibilityLabel={`done: ${event.title}`}
          hitSlop={8}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          {event.done && <Stamp text="DONE" />}
          <View style={{
            width: 22, height: 22, borderWidth: 2, borderColor: colors.ink,
            backgroundColor: event.done ? colors.ink : colors.paper,
            alignItems: 'center', justifyContent: 'center',
          }}>
            {event.done && (
              <Text style={{ fontFamily: fontFamilies.mono, fontSize: 14, color: colors.paper }}>✓</Text>
            )}
          </View>
        </Pressable>
      </View>

      <Text
        numberOfLines={1}
        style={{ fontFamily: fontFamilies.body, fontSize: 15, color: colors.ink }}
      >
        {event.title}
      </Text>
      {event.description !== '' && (
        <Text
          numberOfLines={2}
          style={{ fontFamily: fontFamilies.mono, fontSize: 12, color: colors.ink70, marginTop: 2 }}
        >
          {event.description}
        </Text>
      )}
      {course && (
        <View style={{ marginTop: 8 }}>
          <Chip glyph={course.emoji} label={course.name} active={false} />
        </View>
      )}
    </BrutCard>
  );
}
