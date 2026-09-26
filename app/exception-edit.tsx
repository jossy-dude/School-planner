import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { validateException } from '@/features/schedule/logic';
import { useSchedule } from '@/features/schedule/store';
import { EmptyState, SegmentedChips, SquareIconButton } from '@/ui/primitives';
import { colors, fontFamilies, hardShadow, radius } from '@/ui/tokens';

const label = {
  fontFamily: fontFamilies.mono, fontSize: 11, color: colors.ink40, letterSpacing: 1,
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
  const { saveException } = useSchedule(courseId);
  const [kind, setKind] = useState<'cancelled' | 'one_off'>('cancelled');
  const [date, setDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const valid = validateException({ date, kind }).ok;

  const submit = async () => {
    const check = validateException({ date, kind });
    if (!check.ok) { setError(check.error ?? 'Check the form'); return; }
    setError(null);
    setBusy(true);
    try {
      await saveException({ courseId, date: date.trim(), kind });
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

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ gap: 16, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ gap: 6 }}>
        <Text style={label}>KIND</Text>
        <SegmentedChips
          options={['CANCELLED', 'EXTRA']}
          value={kind === 'cancelled' ? 'CANCELLED' : 'EXTRA'}
          onChange={(v) => setKind(v === 'CANCELLED' ? 'cancelled' : 'one_off')}
        />
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
          accessibilityLabel="exception date"
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
