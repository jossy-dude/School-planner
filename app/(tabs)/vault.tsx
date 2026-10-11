import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCoursesStore } from '@/features/courses/store';
import { confirmDeleteFile, openStoredFile } from '@/features/files/actions';
import { useFilesStore } from '@/features/files/store';
import { useShallow } from 'zustand/react/shallow';
import { SubjectFolder } from '@/features/vault/components/SubjectFolder';
import { CardStack, StackCardItem } from '@/ui/CardStack';
import { EmptyState, SquareIconButton } from '@/ui/primitives';
import { colors, fontFamilies } from '@/ui/tokens';
import { FileCardFace } from '@/features/vault/components/CardFaces';
import { ScreenBackground } from '@/ui/ScreenBackground';

const MISC_STACK_WIDTH = 230;
const MISC_STACK_HEIGHT = 148;

function MiscFiles() {
  const [open, setOpen] = useState(false);
  // useShallow: filter() hands back a fresh array, and zustand v5 passes the raw
  // selector snapshot to useSyncExternalStore — an uncached array loops forever.
  const files = useFilesStore(useShallow((s) => s.all.filter((f) => f.courseId === null)));
  const removeFile = useFilesStore((s) => s.remove);

  if (files.length === 0) return null;

  const cards: StackCardItem[] = files.map((f) => ({ key: f.id, content: <FileCardFace file={f} /> }));

  return (
    <View style={{ gap: 10 }}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityLabel={`miscellaneous files, ${open ? 'expanded' : 'collapsed'}`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
      >
        <View style={{
          width: 44, height: 44, borderRadius: 10, borderWidth: 1.5, borderColor: colors.ink,
          backgroundColor: colors.ink15, alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 18 }}>▤</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fontFamilies.mono, fontSize: 15, color: colors.ink }}>MISC</Text>
          <Text style={{ fontFamily: fontFamilies.mono, fontSize: 11, color: colors.ink40 }}>
            {files.length} uncategorized file{files.length === 1 ? '' : 's'}
          </Text>
        </View>
      </Pressable>
      {open && (
        <View style={{ alignItems: 'center', height: MISC_STACK_HEIGHT + 8, paddingLeft: 8 }}>
          <CardStack
            cards={cards}
            width={MISC_STACK_WIDTH}
            height={MISC_STACK_HEIGHT}
            onCardPress={(key) => {
              const file = files.find((f) => f.id === key);
              if (file) void openStoredFile(file);
            }}
            onCardLongPress={(key) => {
              const file = files.find((f) => f.id === key);
              if (file) confirmDeleteFile(file, () => { void removeFile(file.id); });
            }}
          />
        </View>
      )}
    </View>
  );
}

export default function VaultScreen() {
  const courses = useCoursesStore((s) => s.courses);
  const refreshCourses = useCoursesStore((s) => s.refresh);
  const refreshAllFiles = useFilesStore((s) => s.refreshAll);

  useFocusEffect(
    useCallback(() => {
      void refreshCourses();
      void refreshAllFiles();
    }, [refreshCourses, refreshAllFiles]),
  );

  const sorted = useMemo(() => [...courses].sort((a, b) => a.name.localeCompare(b.name)), [courses]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenBackground />
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
      }}>
        <Text style={{ fontFamily: fontFamilies.heading, fontSize: 18, color: colors.ink }}>VAULT</Text>
        <SquareIconButton
          glyph="+"
          size={36}
          label="add a file"
          onPress={() => router.push('/file-add')}
        />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 20, paddingTop: 4 }}>
        {sorted.length === 0 ? (
          <EmptyState glyph="▣" label="add a course to start filing things away" />
        ) : (
          sorted.map((course) => <SubjectFolder key={course.id} course={course} />)
        )}
        <MiscFiles />
      </ScrollView>
    </View>
  );
}
