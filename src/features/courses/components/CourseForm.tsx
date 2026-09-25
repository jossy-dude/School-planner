import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Course } from '@/db/schema';
import { SquareIconButton } from '@/ui/primitives';
import { colors, fontFamilies, hardShadow, radius } from '@/ui/tokens';
import { validateCourse } from '../logic';
import { useCoursesStore } from '../store';
import { PatternTile } from './PatternTile';

const EMOJIS = ['📘', '🧮', '🔬', '📕', '🎨', '🌍'];
const SWATCHES = ['#141414', '#C8352A', '#2E6B4F', '#3B5BA5', '#B5852A', '#7A3B8F', '#2A7F8F', '#5C5C5C'];
const PATTERNS = ['dots', 'stripes', 'grid'] as const;

const label = {
  fontFamily: fontFamilies.mono, fontSize: 11, color: colors.ink40, letterSpacing: 1,
} as const;

const fieldBox = {
  borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.paper,
  borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10,
  fontFamily: fontFamilies.body, fontSize: 16, color: colors.ink,
} as const;

function Stepper({ value, onChange, min, step, suffix }:
  { value: number; onChange: (v: number) => void; min: number; step: number; suffix: string }) {
  const btn = {
    width: 32, height: 32, alignItems: 'center' as const, justifyContent: 'center' as const,
    borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.paper2, borderRadius: radius.sm,
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Pressable
        accessibilityLabel={`decrease${suffix}`}
        onPress={() => onChange(Math.max(min, value - step))}
        style={btn}
      >
        <Text style={{ fontSize: 18, color: colors.ink, fontFamily: fontFamilies.heading }}>−</Text>
      </Pressable>
      <Text style={{ fontFamily: fontFamilies.lcd, fontSize: 20, color: colors.ink, minWidth: 54, textAlign: 'center' }}>
        {value}{suffix}
      </Text>
      <Pressable
        accessibilityLabel={`increase${suffix}`}
        onPress={() => onChange(value + step)}
        style={btn}
      >
        <Text style={{ fontSize: 18, color: colors.ink, fontFamily: fontFamilies.heading }}>+</Text>
      </Pressable>
    </View>
  );
}

export function CourseForm({ mode, course }: { mode: 'create' | 'edit'; course?: Course }) {
  const { create, update } = useCoursesStore();
  const [name, setName] = useState(course?.name ?? '');
  const [code, setCode] = useState(course?.code ?? '');
  const [emoji, setEmoji] = useState(course?.emoji ?? '📘');
  const [color, setColor] = useState(course?.color ?? '#141414');
  const [pattern, setPattern] = useState<'dots' | 'stripes' | 'grid'>(course?.pattern ?? 'dots');
  const [credits, setCredits] = useState(course?.credits ?? 1);
  const [duration, setDuration] = useState(course?.defaultDurationMin ?? 60);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const r = validateCourse({
      name, code, emoji, color, pattern, credits, defaultDurationMin: duration,
      termId: course?.termId ?? null,
      reminderLeadOverrideMin: course?.reminderLeadOverrideMin ?? null,
    });
    if (!r.ok) { setError(r.error); return; }
    setError(null);
    setBusy(true);
    try {
      if (mode === 'create') await create(r.value);
      else if (course) await update(course.id, r.value);
      else { setError('Course not found'); setBusy(false); return; }
      router.back();
    } catch {
      setError('Could not save course');
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 16 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <SquareIconButton glyph="←" onPress={() => router.back()} size={40} />
        <Text style={{ fontFamily: fontFamilies.heading, fontSize: 16, color: colors.ink }}>
          {mode === 'create' ? 'NEW COURSE' : 'EDIT COURSE'}
        </Text>
      </View>

      <PatternTile color={color} pattern={pattern} height={56} />

      <View style={{ gap: 6 }}>
        <Text style={label}>NAME</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Mathematics"
          placeholderTextColor={colors.ink40}
          style={fieldBox}
          autoCapitalize="words"
        />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={label}>CODE</Text>
        <TextInput
          value={code}
          onChangeText={setCode}
          placeholder="e.g. MATH101"
          placeholderTextColor={colors.ink40}
          style={[fieldBox, { fontFamily: fontFamilies.mono, textTransform: 'uppercase' }]}
          autoCapitalize="characters"
        />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={label}>EMOJI</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {EMOJIS.map((e) => {
            const active = e === emoji;
            return (
              <Pressable
                key={e}
                onPress={() => setEmoji(e)}
                accessibilityRole="button"
                accessibilityLabel={`emoji ${e}`}
                style={{
                  width: 48, height: 48, alignItems: 'center', justifyContent: 'center',
                  borderWidth: 2, borderRadius: radius.sm,
                  borderColor: active ? colors.ink : colors.ink15,
                  backgroundColor: active ? colors.paper2 : colors.paper,
                  ...(active ? hardShadow : {}),
                }}
              >
                <Text style={{ fontSize: 24 }}>{e}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={label}>COLOR</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {SWATCHES.map((c) => {
            const active = c === color;
            return (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                accessibilityRole="button"
                accessibilityLabel={`color ${c}`}
                style={{
                  width: 40, height: 40, borderRadius: radius.sm,
                  backgroundColor: c,
                  borderWidth: active ? 4 : 2,
                  borderColor: active ? colors.ink : colors.white,
                  ...(active ? hardShadow : {}),
                }}
              />
            );
          })}
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={label}>PATTERN</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {PATTERNS.map((p) => {
            const active = p === pattern;
            return (
              <Pressable
                key={p}
                onPress={() => setPattern(p)}
                accessibilityRole="button"
                accessibilityLabel={`pattern ${p}`}
                style={{
                  paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill,
                  borderWidth: 1.5, backgroundColor: active ? colors.ink : colors.paper,
                  borderColor: colors.ink,
                }}
              >
                <Text style={{ fontFamily: fontFamilies.mono, fontSize: 12, color: active ? colors.paper : colors.ink }}>
                  {p}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={label}>CREDITS</Text>
        <Stepper value={credits} onChange={setCredits} min={0} step={1} suffix="" />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={label}>DEFAULT DURATION</Text>
        <Stepper value={duration} onChange={setDuration} min={5} step={5} suffix="m" />
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
          {busy ? 'SAVING…' : mode === 'create' ? 'CREATE COURSE' : 'SAVE CHANGES'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
