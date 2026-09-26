import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Note } from '@/db/schema';
import { BrutCard } from '@/ui/BrutCard';
import { Stamp } from '@/ui/primitives';
import { colors, fontFamilies } from '@/ui/tokens';

export function NoteList({ notes, courseId }: { notes: Note[]; courseId: string }) {
  return (
    <View style={{ gap: 8 }}>
      {notes.map((n) => (
        <BrutCard
          key={n.id}
          onPress={() => router.push({ pathname: '/note-edit', params: { id: n.id, courseId } })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <Stamp text={n.kind === 'teacher_said' ? 'SAID' : 'TIP'} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: fontFamilies.body, fontSize: 15, color: colors.ink }}>
                {n.body}
              </Text>
              {n.description !== null && n.description !== '' && (
                <Text style={{ fontFamily: fontFamilies.mono, fontSize: 11, color: colors.ink40 }}>
                  {n.description}
                </Text>
              )}
            </View>
          </View>
        </BrutCard>
      ))}
    </View>
  );
}
