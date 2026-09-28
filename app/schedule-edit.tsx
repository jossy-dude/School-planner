import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Pattern } from '@/db/schema';
import { TimeField } from '@/features/schedule/components/TimeField';
import { WeekdayChips } from '@/features/schedule/components/WeekdayChips';
import { isValidTime, PatternDraft, validatePattern } from '@/features/schedule/logic';
import { useSchedule } from '@/features/schedule/store';
import { EmptyState, SquareIconButton } from '@/ui/primitives';
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

function PatternForm({ courseId, pattern, savePattern, removePattern }: {
  courseId: string;
  pattern: Pattern | undefined;
  savePattern: (patch: PatternDraft) => Promise<Pattern>;
  removePattern: (id: string) => Promise<void>;
}) {
  const editing = Boolean(pattern);
  const [weekday, setWeekday] = useState(pattern?.weekday ?? 0);
  const [start, setStart] = useState(pattern?.startTime ?? '');
  const [end, setEnd] = useState(pattern?.endTime ?? '');
  const [location, setLocation] = useState(pattern?.location ?? '');
  const [validFrom, setValidFrom] = useState(pattern?.validFrom ?? '');
  const [validTo, setValidTo] = useState(pattern?.validTo ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const crossesMidnight = isValidTime(start) && isValidTime(end) && end < start;

  const submit = async () => {
    const r = validatePattern({ weekday, startTime: start, endTime: end, location, validFrom, validTo });
    if (!r.ok) { setError(r.error); return; }
    setError(null);
    setBusy(true);
    try {
      await savePattern({ id: pattern?.id, courseId, ...r.value });
      router.back();
    } catch {
      setError('Could not save pattern');
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    if (!pattern) return;
    Alert.alert('Delete pattern?', 'This class time will be permanently removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removePattern(pattern.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 16 }}
      keyboardShouldPersistTaps="handled"
    >
      <Header title={editing ? 'EDIT CLASS' : 'NEW CLASS'} />

      <View style={{ gap: 6 }}>
        <Text style={label}>WEEKDAY</Text>
        <WeekdayChips value={weekday} onChange={setWeekday} />
      </View>

      <View style={{ flexDirection: 'row', gap: 16 }}>
        <View style={{ gap: 6, flex: 1 }}>
          <Text style={label}>START</Text>
          <TimeField value={start} onChange={setStart} />
        </View>
        <View style={{ gap: 6, flex: 1 }}>
          <Text style={label}>END</Text>
          <TimeField value={end} onChange={setEnd} />
        </View>
      </View>

      {crossesMidnight && (
        <Text style={{ fontFamily: fontFamilies.mono, fontSize: 12, color: colors.ink40 }}>
          ends next day
        </Text>
      )}

      <View style={{ gap: 6 }}>
        <Text style={label}>LOCATION</Text>
        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder="e.g. Room B2"
          placeholderTextColor={colors.ink40}
          style={fieldBox}
          autoCapitalize="words"
        />
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ gap: 6, flex: 1 }}>
          <Text style={label}>VALID FROM (OPTIONAL)</Text>
          <TextInput
            value={validFrom}
            onChangeText={setValidFrom}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.ink40}
            style={[fieldBox, { fontFamily: fontFamilies.mono }]}
            autoCapitalize="none"
          />
        </View>
        <View style={{ gap: 6, flex: 1 }}>
          <Text style={label}>VALID TO (OPTIONAL)</Text>
          <TextInput
            value={validTo}
            onChangeText={setValidTo}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.ink40}
            style={[fieldBox, { fontFamily: fontFamilies.mono }]}
            autoCapitalize="none"
          />
        </View>
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

      {editing && (
        <Pressable
          onPress={confirmDelete}
          accessibilityRole="button"
          style={{
            borderWidth: 2, borderColor: colors.danger, backgroundColor: colors.paper,
            paddingVertical: 14, alignItems: 'center', borderRadius: radius.md,
          }}
        >
          <Text style={{ fontFamily: fontFamilies.heading, fontSize: 14, color: colors.danger }}>DELETE</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

export default function ScheduleEditScreen() {
  const { courseId, patternId } = useLocalSearchParams<{ courseId?: string; patternId?: string }>();
  const { patterns, loaded, refresh, savePattern, removePattern } = useSchedule(courseId);
  const editing = Boolean(patternId);

  useEffect(() => { refresh(); }, [refresh]);

  if (!courseId) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, padding: 16, gap: 16 }}>
        <Header title="SCHEDULE" />
        <EmptyState glyph="◷" label="missing course id" />
      </View>
    );
  }

  if (editing && !loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, padding: 16, gap: 16 }}>
        <Header title="EDIT CLASS" />
        <EmptyState glyph="◷" label="loading…" />
      </View>
    );
  }

  const existing = patternId ? patterns.find((p) => p.id === patternId) : undefined;

  if (editing && !existing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, padding: 16, gap: 16 }}>
        <Header title="EDIT CLASS" />
        <EmptyState glyph="◷" label="pattern not found" />
      </View>
    );
  }

  return (
    <PatternForm
      key={existing?.id ?? 'new'}
      courseId={courseId}
      pattern={existing}
      savePattern={savePattern}
      removePattern={removePattern}
    />
  );
}
