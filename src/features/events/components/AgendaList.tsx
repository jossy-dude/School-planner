import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { SchoolEvent } from '@/db/schema';
import { toDateId } from '@/lib/schedule';
import { EmptyState } from '@/ui/primitives';
import { useEventsStore } from '../store';
import { TicketCard } from './TicketCard';

const DAY_MS = 86_400_000;
const WINDOW_DAYS = 7;

export interface AgendaListProps {
  /** Single-day agenda: events whose local due date equals this dateId. */
  dateId?: string;
  /** Window mode (no dateId): rolling 7-day window starting today + dayOffset days. */
  dayOffset?: number;
}

// Sorted TicketCards for a date or the next 7 days. View-only over the store —
// it triggers the same guarded first-load as TicketCard's course fetch, while
// callers that need refocus reloads own the refresh (Today's DueSection does).
export function AgendaList({ dateId, dayOffset = 0 }: AgendaListProps) {
  const events = useEventsStore((s) => s.events);
  const loaded = useEventsStore((s) => s.loaded);
  const refresh = useEventsStore((s) => s.refresh);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (loaded) return;
    void refresh().catch(() => {});
  }, [loaded, refresh]);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const list = useMemo(() => {
    const sorted: SchoolEvent[] = [...events].sort(
      (a, b) => a.dueAt.getTime() - b.dueAt.getTime(),
    );
    if (dateId !== undefined) return sorted.filter((e) => toDateId(e.dueAt) === dateId);
    const startMs = nowMs + dayOffset * DAY_MS;
    const endMs = startMs + WINDOW_DAYS * DAY_MS;
    return sorted.filter((e) => {
      const at = e.dueAt.getTime();
      return at >= startMs && at < endMs;
    });
  }, [events, dateId, dayOffset, nowMs]);

  if (list.length === 0) return <EmptyState glyph="◆" label="nothing scheduled" />;
  return (
    <View style={{ gap: 12 }}>
      {list.map((event) => (
        <TicketCard key={event.id} event={event} nowMs={nowMs} />
      ))}
    </View>
  );
}
