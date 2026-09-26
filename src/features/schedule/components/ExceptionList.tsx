import { Alert, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScheduleException } from '@/db/schema';
import { patternLabel } from '@/features/schedule/logic';
import { useSchedule } from '@/features/schedule/store';
import { BrutCard } from '@/ui/BrutCard';
import { SquareIconButton, Stamp } from '@/ui/primitives';
import { colors, fontFamilies } from '@/ui/tokens';

export function ExceptionList({ courseId }: { courseId: string }) {
  const { exceptions, patterns, removeException } = useSchedule(courseId);

  const confirmDelete = (e: ScheduleException) => {
    Alert.alert('Delete exception?', `${e.date} will be removed from the schedule.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { void removeException(e.id); } },
    ]);
  };

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: fontFamilies.mono, fontSize: 11, color: colors.ink40, letterSpacing: 1 }}>
          EXCEPTIONS
        </Text>
        <SquareIconButton
          glyph="+"
          size={32}
          label="add exception"
          onPress={() => router.push({ pathname: '/exception-edit', params: { courseId } })}
        />
      </View>
      {exceptions.length === 0 ? (
        <Text style={{ fontFamily: fontFamilies.mono, fontSize: 12, color: colors.ink40 }}>
          none yet
        </Text>
      ) : (
        exceptions.map((e) => {
          const bound = e.patternId ? patterns.find((p) => p.id === e.patternId) : undefined;
          const detail = e.kind === 'cancelled'
            ? (bound ? patternLabel(bound) : null)
            : (e.startTime && e.endTime ? `${e.startTime}–${e.endTime}` : null);
          return (
            <BrutCard key={e.id} onLongPress={() => confirmDelete(e)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontFamily: fontFamilies.mono, fontSize: 13, color: colors.ink70 }}>
                  {e.date}
                </Text>
                <Stamp
                  text={e.kind === 'cancelled' ? 'CANCELLED' : 'EXTRA'}
                  tone={e.kind === 'cancelled' ? 'danger' : 'ink'}
                />
                {detail !== null && (
                  <Text
                    numberOfLines={1}
                    style={{ fontFamily: fontFamilies.mono, fontSize: 11, color: colors.ink40, flexShrink: 1 }}
                  >
                    {detail}
                  </Text>
                )}
              </View>
            </BrutCard>
          );
        })
      )}
    </View>
  );
}
