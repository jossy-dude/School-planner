import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { EventForm } from '@/features/events/components/EventForm';
import { useEventsStore } from '@/features/events/store';
import { isValidDateId } from '@/features/schedule/logic';
import { parseDateId } from '@/lib/schedule';
import { EmptyState, SquareIconButton } from '@/ui/primitives';
import { colors, fontFamilies } from '@/ui/tokens';

function Header({ title }: { title: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <SquareIconButton glyph="←" onPress={() => router.back()} size={40} />
      <Text style={{ fontFamily: fontFamilies.heading, fontSize: 16, color: colors.ink }}>{title}</Text>
    </View>
  );
}

// New events default to the requested calendar day (or today) at 23:59 local.
function defaultDueAtMs(dueAt?: string): number {
  const base = dueAt !== undefined && isValidDateId(dueAt) ? parseDateId(dueAt) : new Date();
  base.setHours(23, 59, 0, 0);
  return base.getTime();
}

export default function EventModal() {
  const { id, dueAt, courseId } = useLocalSearchParams<{ id?: string; dueAt?: string; courseId?: string }>();
  const events = useEventsStore((s) => s.events);
  const loaded = useEventsStore((s) => s.loaded);
  const refresh = useEventsStore((s) => s.refresh);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isNew = id === 'new';
  const existing = isNew ? undefined : events.find((e) => e.id === id);

  let content: ReactNode;
  if (!id) {
    content = <EmptyState glyph="◆" label="missing event id" />;
  } else if (!isNew && !loaded) {
    content = <EmptyState glyph="◆" label="loading…" />;
  } else if (!isNew && !existing) {
    content = <EmptyState glyph="◆" label="event not found" />;
  } else {
    content = (
      <EventForm
        key={existing?.id ?? 'new'}
        event={existing}
        initialDueAtMs={defaultDueAtMs(dueAt)}
        initialCourseId={courseId ?? null}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, padding: 16, gap: 16 }}>
      <Header title={!id ? 'EVENT' : isNew ? 'NEW EVENT' : 'EDIT EVENT'} />
      {content}
    </View>
  );
}
