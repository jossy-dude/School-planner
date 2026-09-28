import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCoursesStore } from '@/features/courses/store';
import { useFilesStore } from '@/features/files/store';
import { CATEGORY_LABEL, FILE_CATEGORIES, fileGlyph, FileCategory, formatFileSize } from '@/features/files/logic';
import { pickAndStoreFile, PickedFile } from '@/features/files/storage';
import { SubjectPicker } from '@/features/timer/components/SubjectPicker';
import { EmptyState, FilterChip } from '@/ui/primitives';
import { BlobBackButton } from '@/ui/BlobBackButton';
import { colors, fontFamilies, hardShadow, radius } from '@/ui/tokens';

function Header({ title }: { title: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <BlobBackButton onPress={() => router.back()} size={40} />
      <Text style={{ fontFamily: fontFamilies.heading, fontSize: 16, color: colors.ink }}>{title}</Text>
    </View>
  );
}

const label = {
  fontFamily: fontFamilies.mono, fontSize: 11, color: colors.ink40, letterSpacing: 1,
} as const;

const fieldBox = {
  borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.paper,
  borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10,
  fontFamily: fontFamilies.body, fontSize: 16, color: colors.ink,
} as const;

function ChooseFileButton({ picked, onPress, busy }: { picked: PickedFile | null; onPress: () => void; busy: boolean }) {
  return (
    <Pressable
      onPress={busy ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={picked ? `change file, currently ${picked.name}` : 'choose a file'}
      style={{
        borderWidth: 2, borderColor: colors.ink, borderStyle: picked ? 'solid' : 'dashed',
        borderRadius: radius.md, backgroundColor: colors.paper, padding: 14,
        flexDirection: 'row', alignItems: 'center', gap: 12, opacity: busy ? 0.6 : 1,
      }}
    >
      <Text style={{ fontSize: 24 }}>{picked ? fileGlyph(picked.name) : '＋'}</Text>
      <View style={{ flex: 1 }}>
        {picked ? (
          <>
            <Text numberOfLines={1} style={{ fontFamily: fontFamilies.body, fontSize: 15, color: colors.ink }}>
              {picked.name}
            </Text>
            <Text style={{ fontFamily: fontFamilies.mono, fontSize: 11, color: colors.ink40 }}>
              {formatFileSize(picked.size)} · tap to change
            </Text>
          </>
        ) : (
          <Text style={{ fontFamily: fontFamilies.mono, fontSize: 13, color: colors.ink70 }}>
            CHOOSE A FILE FROM THIS DEVICE
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export default function FileAddModal() {
  const { courseId: initialCourseId } = useLocalSearchParams<{ courseId?: string }>();
  const courses = useCoursesStore((s) => s.courses);
  const add = useFilesStore((s) => s.add);

  const [courseId, setCourseId] = useState<string | null>(
    initialCourseId !== undefined && initialCourseId !== 'none' ? initialCourseId : null,
  );
  const [category, setCategory] = useState<FileCategory>('materials');
  const [description, setDescription] = useState('');
  const [picked, setPicked] = useState<PickedFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = async () => {
    setError(null);
    setBusy(true);
    try {
      const result = await pickAndStoreFile();
      if (result) setPicked(result);
    } catch {
      setError('Could not open the file picker');
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!picked) { setError('Choose a file first'); return; }
    setError(null);
    setBusy(true);
    try {
      await add({
        courseId,
        category,
        name: picked.name,
        sandboxUri: picked.sandboxUri,
        size: picked.size,
        mime: picked.mime,
        description: description.trim() === '' ? null : description.trim(),
      });
      router.back();
    } catch {
      setError('Could not save the file');
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, padding: 16, gap: 16 }}>
      <Header title="ADD FILE" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 6 }}>
          <Text style={label}>FILE</Text>
          <ChooseFileButton picked={picked} onPress={() => void choose()} busy={busy} />
        </View>

        <View style={{ gap: 6 }}>
          <Text style={label}>CATEGORY</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {FILE_CATEGORIES.map((c) => (
              <FilterChip key={c} label={CATEGORY_LABEL[c]} active={category === c} onPress={() => setCategory(c)} />
            ))}
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <Text style={label}>COURSE</Text>
          {courses.length === 0 ? (
            <EmptyState glyph="▣" label="no courses yet — this file will be uncategorized" />
          ) : (
            <SubjectPicker courses={courses} selectedId={courseId} onSelect={setCourseId} disabled={busy} />
          )}
        </View>

        <View style={{ gap: 6 }}>
          <Text style={label}>NOTE (OPTIONAL)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What is this file for?"
            placeholderTextColor={colors.ink40}
            style={[fieldBox, { minHeight: 72, textAlignVertical: 'top' }]}
            multiline
            autoCapitalize="sentences"
            accessibilityLabel="file note"
          />
        </View>

        {error !== null && (
          <Text style={{ fontFamily: fontFamilies.mono, fontSize: 13, color: colors.danger }} accessibilityRole="alert">
            {error}
          </Text>
        )}

        <Pressable
          onPress={() => void submit()}
          disabled={busy || !picked}
          accessibilityRole="button"
          accessibilityLabel="save file"
          style={{
            backgroundColor: colors.ink, borderWidth: 2, borderColor: colors.ink,
            paddingVertical: 14, alignItems: 'center', borderRadius: radius.md,
            opacity: busy || !picked ? 0.6 : 1, ...hardShadow,
          }}
        >
          <Text style={{ fontFamily: fontFamilies.heading, fontSize: 14, color: colors.paper }}>
            {busy ? 'SAVING…' : 'SAVE'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
