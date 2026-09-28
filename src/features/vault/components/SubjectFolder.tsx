import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Course } from '@/db/schema';
import { confirmDeleteFile, openStoredFile } from '@/features/files/actions';
import { useCourseFiles, useFilesStore } from '@/features/files/store';
import { useCourseNotesCache } from '@/features/notes/store';
import { CardStack, StackCardItem } from '@/ui/CardStack';
import { Folder } from '@/ui/Folder';
import { EmptyState } from '@/ui/primitives';
import { colors, fontFamilies, radius } from '@/ui/tokens';
import { FileCardFace, NoteCardFace } from './CardFaces';

const STACK_WIDTH = 230;
const STACK_HEIGHT = 148;

function QuickPill({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label.toLowerCase()}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: colors.ink,
        borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.paper,
      }}
    >
      <Text style={{ fontFamily: fontFamilies.mono, fontSize: 11, color: colors.ink }}>+ {label}</Text>
    </Pressable>
  );
}

export function SubjectFolder({ course }: { course: Course }) {
  const [open, setOpen] = useState(false);
  const { files, refresh: refreshFiles } = useCourseFiles(course.id);
  const { notes, refresh: refreshNotes } = useCourseNotesCache(course.id);
  const removeFile = useFilesStore((s) => s.remove);

  useEffect(() => {
    if (!open) return;
    void refreshFiles();
    void refreshNotes();
  }, [open, refreshFiles, refreshNotes]);

  const cards = useMemo<StackCardItem[]>(() => [
    ...files.map((f) => ({ key: `f:${f.id}`, content: <FileCardFace file={f} /> })),
    ...notes.map((n) => ({ key: `n:${n.id}`, content: <NoteCardFace note={n} /> })),
  ], [files, notes]);

  const handleCardPress = (key: string) => {
    const [kind, id] = key.split(':');
    if (kind === 'f') {
      const file = files.find((f) => f.id === id);
      if (file) void openStoredFile(file);
    } else {
      const note = notes.find((n) => n.id === id);
      if (note) router.push({ pathname: '/note-edit', params: { id: note.id, courseId: course.id } });
    }
  };

  // Notes are edited (and removed) through the full /note-edit screen; a file
  // card has no such screen, so long-pressing it here is its only delete path.
  const handleCardLongPress = (key: string) => {
    const [kind, id] = key.split(':');
    if (kind !== 'f') return;
    const file = files.find((f) => f.id === id);
    if (file) confirmDeleteFile(file, () => { void removeFile(file.id); });
  };

  return (
    <View style={{ gap: 10 }}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityLabel={`${course.name} folder, ${open ? 'expanded' : 'collapsed'}`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
      >
        <Folder
          color={course.color}
          open={open}
          onToggle={() => setOpen((o) => !o)}
          filledCount={Math.min(3, files.length + notes.length)}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fontFamilies.mono, fontSize: 15, color: colors.ink }}>
            {course.emoji} {course.name}
          </Text>
          <Text style={{ fontFamily: fontFamilies.mono, fontSize: 11, color: colors.ink40 }}>
            {files.length} file{files.length === 1 ? '' : 's'} · {notes.length} note{notes.length === 1 ? '' : 's'}
          </Text>
        </View>
      </Pressable>

      {open && (
        <View style={{ gap: 10, paddingLeft: 8 }}>
          {cards.length === 0 ? (
            <EmptyState glyph="▤" label="nothing filed here yet" />
          ) : (
            <View style={{ alignItems: 'center', height: STACK_HEIGHT + 8 }}>
              <CardStack
                cards={cards}
                width={STACK_WIDTH}
                height={STACK_HEIGHT}
                onCardPress={handleCardPress}
                onCardLongPress={handleCardLongPress}
              />
            </View>
          )}
          {cards.length > 0 && (
            <Text style={{ fontFamily: fontFamilies.mono, fontSize: 10, color: colors.ink40, textAlign: 'center' }}>
              DRAG A CARD ASIDE FOR THE NEXT · TAP TO OPEN · HOLD A FILE TO DELETE
            </Text>
          )}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <QuickPill label="FILE" onPress={() => router.push({ pathname: '/file-add', params: { courseId: course.id } })} />
            <QuickPill label="NOTE" onPress={() => router.push({ pathname: '/note-edit', params: { courseId: course.id } })} />
          </View>
        </View>
      )}
    </View>
  );
}
