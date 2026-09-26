import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Grade } from '@/db/schema';
import { isValidDateId } from '@/features/schedule/logic';
import { SquareIconButton } from '@/ui/primitives';
import { colors, fontFamilies, hardShadow, radius } from '@/ui/tokens';
import { toDateId } from '@/lib/schedule';
import { validateGrade } from '../logic';
import { useGrades } from '../store';
import { CategoryChips, Chip } from './CategoryChips';

const label = {
  fontFamily: fontFamilies.mono, fontSize: 11, color: colors.ink40, letterSpacing: 1,
} as const;

const fieldBox = {
  borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.paper,
  borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10,
  fontFamily: fontFamilies.body, fontSize: 16, color: colors.ink,
} as const;

const WEIGHT_STEPS = [0.5, 1, 2, 3, 5];

// Steps toward the pressed direction; null snaps to 1; ends clamp.
function stepWeight(current: number | null, dir: 1 | -1): number {
  if (current === null) return 1;
  const first = WEIGHT_STEPS[0] ?? 1;
  const last = WEIGHT_STEPS[WEIGHT_STEPS.length - 1] ?? 5;
  const idx = WEIGHT_STEPS.findIndex((w) => (dir === 1 ? w > current : w < current));
  if (idx === -1) return dir === 1 ? last : first;
  return WEIGHT_STEPS[idx] ?? current;
}

export function GradeForm({ grade, courseId }: { grade?: Grade; courseId: string }) {
  const { categories, addGrade, updateGrade, removeGrade, refresh } = useGrades(courseId);
  useEffect(() => { void refresh(courseId); }, [refresh, courseId]);

  const [title, setTitle] = useState(grade?.title ?? '');
  const [scoreText, setScoreText] = useState(grade !== undefined ? String(grade.score) : '');
  const [maxText, setMaxText] = useState(grade !== undefined ? String(grade.maxScore) : '100');
  const [date, setDate] = useState(grade?.date ?? toDateId(new Date()));
  const [categoryId, setCategoryId] = useState<string | null>(grade?.categoryId ?? null);
  const [weightOverride, setWeightOverride] = useState<number | null>(grade?.weightOverride ?? null);
  const [note, setNote] = useState(grade?.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const score = Number(scoreText.trim());
    const maxScore = Number(maxText.trim());
    if (scoreText.trim() === '' || Number.isNaN(score)) { setError('Score must be a number'); return; }
    if (maxText.trim() === '' || Number.isNaN(maxScore)) { setError('Max score must be a number'); return; }
    const r = validateGrade({ title, score, maxScore });
    if (!r.ok) { setError(r.error ?? 'Check the form'); return; }
    if (!isValidDateId(date)) { setError('Date must be YYYY-MM-DD'); return; }
    setError(null);
    setBusy(true);
    try {
      const payload = {
        categoryId,
        title: title.trim(),
        score,
        maxScore,
        weightOverride,
        date,
        note: note.trim() === '' ? null : note.trim(),
      };
      if (grade) await updateGrade(grade.id, payload);
      else await addGrade(payload);
      router.back();
    } catch {
      setError('Could not save grade');
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    if (!grade) return;
    Alert.alert('Delete grade?', `${grade.title} will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await removeGrade(grade.id);
            router.back();
          } catch {
            setBusy(false);
            setError('Could not delete grade');
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
        <Text style={label}>TITLE</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Midterm"
          placeholderTextColor={colors.ink40}
          style={fieldBox}
          autoCapitalize="sentences"
        />
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ gap: 6, flex: 1 }}>
          <Text style={label}>SCORE</Text>
          <TextInput
            value={scoreText}
            onChangeText={setScoreText}
            placeholder="18"
            placeholderTextColor={colors.ink40}
            keyboardType="decimal-pad"
            style={[fieldBox, { fontFamily: fontFamilies.lcd }]}
            accessibilityLabel="score"
          />
        </View>
        <View style={{ gap: 6, flex: 1 }}>
          <Text style={label}>MAX</Text>
          <TextInput
            value={maxText}
            onChangeText={setMaxText}
            placeholder="100"
            placeholderTextColor={colors.ink40}
            keyboardType="decimal-pad"
            style={[fieldBox, { fontFamily: fontFamilies.lcd }]}
            accessibilityLabel="max score"
          />
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={label}>DATE</Text>
        <TextInput
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.ink40}
          style={[fieldBox, { fontFamily: fontFamilies.mono }]}
          autoCapitalize="none"
          accessibilityLabel="grade date"
        />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={label}>CATEGORY</Text>
        <CategoryChips categories={categories} selectedId={categoryId} onSelect={setCategoryId} />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={label}>WEIGHT OVERRIDE</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <SquareIconButton
            glyph="−"
            size={32}
            label="decrease weight override"
            onPress={() => setWeightOverride((w) => stepWeight(w, -1))}
          />
          <View style={{
            minWidth: 76, borderWidth: 2, borderColor: colors.ink, borderRadius: radius.sm,
            backgroundColor: colors.paper, paddingVertical: 8, alignItems: 'center',
          }}>
            <Text style={{
              fontFamily: fontFamilies.lcd, fontSize: 16,
              color: weightOverride === null ? colors.ink40 : colors.ink,
            }}>
              {weightOverride === null ? '×—' : `×${weightOverride}`}
            </Text>
          </View>
          <SquareIconButton
            glyph="+"
            size={32}
            label="increase weight override"
            onPress={() => setWeightOverride((w) => stepWeight(w, 1))}
          />
          <Chip
            label="NONE"
            active={weightOverride === null}
            onPress={() => setWeightOverride(null)}
          />
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={label}>NOTE</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Optional details…"
          placeholderTextColor={colors.ink40}
          style={[fieldBox, { minHeight: 72, textAlignVertical: 'top' }]}
          multiline
          autoCapitalize="sentences"
        />
      </View>

      {error !== null && (
        <Text style={{ fontFamily: fontFamilies.mono, fontSize: 13, color: colors.danger }} accessibilityRole="alert">
          {error}
        </Text>
      )}

      <Pressable
        onPress={submit}
        disabled={busy}
        accessibilityRole="button"
        style={{
          backgroundColor: colors.ink, borderWidth: 2, borderColor: colors.ink,
          paddingVertical: 14, alignItems: 'center', borderRadius: radius.md,
          opacity: busy ? 0.6 : 1, ...hardShadow,
        }}
      >
        <Text style={{ fontFamily: fontFamilies.heading, fontSize: 14, color: colors.paper }}>
          {busy ? 'SAVING…' : 'SAVE'}
        </Text>
      </Pressable>

      {grade && (
        <Pressable
          onPress={confirmDelete}
          disabled={busy}
          accessibilityRole="button"
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
