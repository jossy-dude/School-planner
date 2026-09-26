import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SchoolEvent } from '@/db/schema';
import { useCoursesStore } from '@/features/courses/store';
import { TimeField } from '@/features/schedule/components/TimeField';
import { isValidDateId, isValidTime } from '@/features/schedule/logic';
import { colors, fontFamilies, hardShadow, radius } from '@/ui/tokens';
import { composeDueAtMs, dueAtToParts, EVENT_KINDS, EventKind, validateEvent } from '../logic';
import { useEventsStore } from '../store';
import { Chip, KindChip } from './KindChip';

const label = {
  fontFamily: fontFamilies.mono, fontSize: 11, color: colors.ink40, letterSpacing: 1,
} as const;

const fieldBox = {
  borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.paper,
  borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10,
  fontFamily: fontFamilies.body, fontSize: 16, color: colors.ink,
} as const;

const LEADS: { leadLabel: string; value: number | null }[] = [
  { leadLabel: 'DEFAULT', value: null },
  { leadLabel: '15M', value: 15 },
  { leadLabel: '1H', value: 60 },
  { leadLabel: '24H', value: 1440 },
];

export function EventForm({ event, initialDueAtMs, initialCourseId }: {
  event?: SchoolEvent;
  initialDueAtMs: number;
  initialCourseId?: string | null;
}) {
  const { create, update, remove } = useEventsStore();
  const courses = useCoursesStore((s) => s.courses);
  const refreshCourses = useCoursesStore((s) => s.refresh);

  const seed = dueAtToParts(event !== undefined ? event.dueAt.getTime() : initialDueAtMs);
  const [kind, setKind] = useState<EventKind>(event?.kind ?? 'assignment');
  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [courseId, setCourseId] = useState<string | null>(event?.courseId ?? initialCourseId ?? null);
  const [dateId, setDateId] = useState(seed.dateId);
  const [time, setTime] = useState(seed.time);
  const [lead, setLead] = useState<number | null>(event?.remindLeadOverrideMin ?? null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void refreshCourses();
  }, [refreshCourses]);

  const submit = async () => {
    if (!isValidDateId(dateId)) { setError('Due date must be YYYY-MM-DD'); return; }
    if (!isValidTime(time)) { setError('Enter a valid time (00:00–23:59)'); return; }
    const dueAtMs = composeDueAtMs(dateId, time);
    const r = validateEvent({ title, dueAtMs, kind });
    if (!r.ok) { setError(r.error ?? 'Check the form'); return; }
    setError(null);
    setBusy(true);
    try {
      const draft = {
        kind, title: title.trim(), description, courseId, dueAtMs, remindLeadOverrideMin: lead,
      };
      if (event) await update(event.id, draft);
      else await create(draft);
      router.back();
    } catch {
      setError('Could not save event');
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    if (!event) return;
    Alert.alert('Delete event?', 'This deadline will be permanently removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await remove(event.id);
            router.back();
          } catch {
            setError('Could not delete event');
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
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {EVENT_KINDS.map((k) => (
            <KindChip key={k} kind={k} active={k === kind} onPress={() => setKind(k)} />
          ))}
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={label}>TITLE</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Essay 2"
          placeholderTextColor={colors.ink40}
          style={fieldBox}
          autoCapitalize="sentences"
        />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={label}>DESCRIPTION</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Optional details…"
          placeholderTextColor={colors.ink40}
          style={[fieldBox, { minHeight: 88, textAlignVertical: 'top' }]}
          multiline
          numberOfLines={4}
          autoCapitalize="sentences"
        />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={label}>COURSE</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip label="NONE" active={courseId === null} onPress={() => setCourseId(null)} />
          {courses.map((c) => (
            <Chip
              key={c.id}
              glyph={c.emoji}
              label={c.name}
              active={courseId === c.id}
              onPress={() => setCourseId(c.id)}
            />
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ gap: 6, flex: 1 }}>
          <Text style={label}>DUE DATE</Text>
          <TextInput
            value={dateId}
            onChangeText={setDateId}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.ink40}
            style={[fieldBox, { fontFamily: fontFamilies.mono }]}
            autoCapitalize="none"
            accessibilityLabel="due date"
          />
        </View>
        <View style={{ gap: 6 }}>
          <Text style={label}>TIME</Text>
          <TimeField value={time} onChange={setTime} />
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={label}>REMIND</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {LEADS.map(({ leadLabel, value }) => (
            <Chip
              key={leadLabel}
              label={leadLabel}
              active={lead === value}
              onPress={() => setLead(value)}
            />
          ))}
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

      {event && (
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
