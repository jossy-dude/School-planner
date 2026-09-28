import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Note } from '@/db/schema';
import { getNoteById } from '@/features/notes/queries';
import { NoteKind, validateNote } from '@/features/notes/logic';
import { useNotes } from '@/features/notes/store';
import { EmptyState, SegmentedChips, SquareIconButton } from '@/ui/primitives';
import { colors, fontFamilies, hardShadow, radius } from '@/ui/tokens';

function Header({ title }: { title: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <SquareIconButton glyph="←" onPress={() => router.back()} size={40} />
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

function NoteForm({ note, courseId }: { note?: Note; courseId: string }) {
  const { create, update, remove } = useNotes(courseId);

  const [kind, setKind] = useState<NoteKind>(note?.kind ?? 'teacher_said');
  const [body, setBody] = useState(note?.body ?? '');
  const [description, setDescription] = useState(note?.description ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // SAVE is disabled while the draft fails validation; submit re-checks as a
  // backstop so a stale press can never persist an empty note.
  const valid = validateNote({ kind, body }).ok;

  const submit = async () => {
    const check = validateNote({ kind, body });
    if (!check.ok) { setError(check.error ?? 'Check the form'); return; }
    setError(null);
    setBusy(true);
    try {
      const payload = {
        kind,
        body: body.trim(),
        description: description.trim() === '' ? null : description.trim(),
      };
      if (note) await update(note.id, payload);
      else await create(payload);
      router.back();
    } catch {
      setError('Could not save note');
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    if (!note) return;
    Alert.alert('Delete note?', 'This note will be permanently removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await remove(note.id);
            router.back();
          } catch {
            setBusy(false);
            setError('Could not delete note');
          }
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ gap: 16, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ gap: 6 }}>
        <Text style={label}>KIND</Text>
        <SegmentedChips
          options={['SAID', 'TIP']}
          value={kind === 'teacher_said' ? 'SAID' : 'TIP'}
          onChange={(v) => setKind(v === 'SAID' ? 'teacher_said' : 'exam_tip')}
        />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={label}>NOTE</Text>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="e.g. Exam moved to Friday"
          placeholderTextColor={colors.ink40}
          style={[fieldBox, { minHeight: 96, textAlignVertical: 'top' }]}
          multiline
          autoCapitalize="sentences"
          accessibilityLabel="note body"
        />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={label}>DETAILS (OPTIONAL)</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Optional details…"
          placeholderTextColor={colors.ink40}
          style={[fieldBox, { minHeight: 72, textAlignVertical: 'top' }]}
          multiline
          autoCapitalize="sentences"
          accessibilityLabel="note details"
        />
      </View>

      {error !== null && (
        <Text style={{ fontFamily: fontFamilies.mono, fontSize: 13, color: colors.danger }} accessibilityRole="alert">
          {error}
        </Text>
      )}

      <Pressable
        onPress={submit}
        disabled={busy || !valid}
        accessibilityRole="button"
        accessibilityLabel="save note"
        style={{
          backgroundColor: colors.ink, borderWidth: 2, borderColor: colors.ink,
          paddingVertical: 14, alignItems: 'center', borderRadius: radius.md,
          opacity: busy || !valid ? 0.6 : 1, ...hardShadow,
        }}
      >
        <Text style={{ fontFamily: fontFamilies.heading, fontSize: 14, color: colors.paper }}>
          {busy ? 'SAVING…' : 'SAVE'}
        </Text>
      </Pressable>

      {note && (
        <Pressable
          onPress={confirmDelete}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="delete note"
          style={{
            borderWidth: 2, borderColor: colors.danger, backgroundColor: colors.paper,
            paddingVertical: 14, alignItems: 'center', borderRadius: radius.md,
            opacity: busy ? 0.6 : 1,
          }}
        >
          <Text style={{ fontFamily: fontFamilies.heading, fontSize: 14, color: colors.danger }}>DELETE</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

export default function NoteModal() {
  const { id, courseId } = useLocalSearchParams<{ id?: string; courseId?: string }>();
  const [resolved, setResolved] = useState<{ id: string; note: Note | null } | null>(null);

  const isNew = id === 'new';

  useEffect(() => {
    if (id === undefined || id === 'new') return;
    let alive = true;
    void getNoteById(id)
      .then((n) => { if (alive) setResolved({ id, note: n }); })
      .catch(() => { if (alive) setResolved({ id, note: null }); });
    return () => { alive = false; };
  }, [id]);

  const existing = !isNew && resolved !== null && resolved.id === id ? resolved.note : null;
  const loading = !isNew && (resolved === null || resolved.id !== id);

  let content: ReactNode;
  if (!id || !courseId) {
    content = <EmptyState glyph="Ⓦ" label="missing note id" />;
  } else if (loading) {
    content = <EmptyState glyph="Ⓦ" label="loading…" />;
  } else if (!isNew && !existing) {
    content = <EmptyState glyph="Ⓦ" label="note not found" />;
  } else {
    content = <NoteForm key={existing?.id ?? 'new'} note={existing ?? undefined} courseId={courseId} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, padding: 16, gap: 16 }}>
      <Header title={!id || !courseId ? 'NOTE' : isNew ? 'NEW NOTE' : 'EDIT NOTE'} />
      {content}
    </View>
  );
}
