import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { TimeField } from '@/features/schedule/components/TimeField';
import { ExceptionDraft, patternLabel, validateException } from '@/features/schedule/logic';
import { useSchedule } from '@/features/schedule/store';
import { EmptyState, FilterChip, SegmentedChips, SquareIconButton } from '@/ui/primitives';
import { colors, fontFamilies, hardShadow, radius } from '@/ui/tokens';

const label = {
  fontFamily: fontFamilies.mono, fontSize: 11, color: colors.ink40, letterSpacing: 1,
} as const;

const hint = {
  fontFamily: fontFamilies.mono, fontSize: 12, color: colors.ink40,
} as const;

const fieldBox = {
  borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.paper,
  borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10,
  fontFamily: fontFamilies.body, fontSize: 16, color: colors.ink,
} as const;

function Header({ title }: { title: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <SquareIconButton glyph="←" onPress={() => router.back()} size={40} />
      <Text style={{ fontFamily: fontFamilies.heading, fontSize: 16, color: colors.ink }}>{title}</Text>
    </View>
  );
}

function isDuplicateException(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  if (code === 2067 || code === '2067') return true;
  const message = error instanceof Error ? error.message : '';
  return /UNIQUE constraint failed/i.test(message);
}

function ExceptionForm({ courseId }: { courseId: string }) {
  const { patterns, refresh, saveException } = useSchedule(courseId);
  const [kind, setKind] = useState<'cancelled' | 'one_off'>('cancelled');
  const [date, setDate] = useState('');
  const [patternId, setPatternId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { refresh(); }, [refresh]);

  const canCancel = patterns.length > 0;
  const activeKind: 'cancelled' | 'one_off' = canCancel ? kind : 'one_off';
  const boundPatternId = activeKind !== 'cancelled'
    ? null
    : (patterns.length === 1 ? patterns[0]?.id ?? null : patternId);

  const check = validateException({
    date,
    kind: activeKind,
    patternId: boundPatternId,
    startTime,
    endTime,
  });
  const valid = check.ok;

  const submit = async () => {
    if (!check.ok) { setError(check.error ?? 'Check the form'); return; }
    setError(null);
    setBusy(true);
    const payload: ExceptionDraft = activeKind === 'cancelled'
      ? { courseId, date: date.trim(), kind: 'cancelled', patternId: boundPatternId }
      : {
        courseId,
        date: date.trim(),
        kind: 'one_off',
        startTime: startTime.trim(),
        endTime: endTime.trim(),
      };
    try {
      await saveException(payload);
      router.back();
    } catch (e) {
      setBusy(false);
      if (isDuplicateException(e)) {
        Alert.alert('Duplicate date', 'An exception already exists for that date.', [{ text: 'OK' }]);
      } else {
        setError('Could not save exception');
      }
    }
  };

  const kindOptions = canCancel ? ['CANCELLED', 'EXTRA'] : ['EXTRA'];

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ gap: 16, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ gap: 6 }}>
        <Text style={label}>KIND</Text>
        <SegmentedChips
          options={kindOptions}
          value={activeKind === 'cancelled' ? 'CANCELLED' : 'EXTRA'}
          onChange={(v) => setKind(v === 'CANCELLED' ? 'cancelled' : 'one_off')}
        />
        {!canCancel && <Text style={hint}>no class times to cancel yet</Text>}
      </View>

      {activeKind === 'cancelled' && patterns.length > 1 && (
        <View style={{ gap: 6 }}>
          <Text style={label}>CLASS TO CANCEL</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {patterns.map((p) => (
              <FilterChip
                key={p.id}
                label={patternLabel(p)}
                active={boundPatternId === p.id}
                onPress={() => setPatternId(p.id)}
              />
            ))}
          </View>
          {boundPatternId === null && <Text style={hint}>pick the class to cancel</Text>}
        </View>
      )}

      <View style={{ gap: 6 }}>
        <Text style={label}>DATE</Text>
        <TextInput
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.ink40}
          style={[fieldBox, { fontFamily: fontFamilies.mono }]}
          autoCapitalize="none"
          accessibilityLabel="exception date"
        />
      </View>

      {activeKind === 'one_off' && (
        <>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View style={{ gap: 6, flex: 1 }}>
              <Text style={label}>START</Text>
              <TimeField value={startTime} onChange={setStartTime} label="start" />
            </View>
            <View style={{ gap: 6, flex: 1 }}>
              <Text style={label}>END</Text>
              <TimeField value={endTime} onChange={setEndTime} label="end" />
            </View>
          </View>
          <Text style={hint}>ends next day when the end is not after the start</Text>
        </>
      )}

      {error !== null && (
        <Text style={{ fontFamily: fontFamilies.mono, fontSize: 13, color: colors.danger }} accessibilityRole="alert">
          {error}
        </Text>
      )}

      <Pressable
        onPress={submit}
        disabled={busy || !valid}
        accessibilityRole="button"
        accessibilityLabel="save exception"
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
    </ScrollView>
  );
}

export default function ExceptionEditScreen() {
  const { courseId } = useLocalSearchParams<{ courseId?: string }>();

  if (!courseId) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, padding: 16, gap: 16 }}>
        <Header title="EXCEPTION" />
        <EmptyState glyph="◷" label="missing course id" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, padding: 16, gap: 16 }}>
      <Header title="NEW EXCEPTION" />
      <ExceptionForm courseId={courseId} />
    </View>
  );
}
