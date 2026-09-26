import { create } from 'zustand';
import { SchoolEvent } from '@/db/schema';
import { refreshReminders } from '@/features/reminders/refresh';
import { toDateId } from '@/lib/schedule';
import { EventDraft, EventPatch } from './logic';
import {
  insertEvent,
  listEventsInRange,
  patchEvent,
  removeEvent,
  toggleDone as toggleDoneRow,
} from './queries';

const DAY_MS = 86_400_000;
// Default window for the in-memory list; callers can pass an explicit range.
const PAST_WINDOW_MS = 90 * DAY_MS;
const FUTURE_WINDOW_MS = 365 * DAY_MS;

interface EventsState {
  events: SchoolEvent[];
  loaded: boolean;
  refresh: (startMs?: number, endMs?: number) => Promise<void>;
  eventsForDate: (dateId: string) => SchoolEvent[];
  create: (draft: EventDraft) => Promise<SchoolEvent>;
  update: (id: string, patch: EventPatch) => Promise<void>;
  remove: (id: string) => Promise<void>;
  toggleDone: (id: string, done: boolean) => Promise<void>;
}

export const useEventsStore = create<EventsState>((set, get) => ({
  events: [],
  loaded: false,
  refresh: async (startMs, endMs) => {
    const now = Date.now();
    const events = await listEventsInRange(
      startMs ?? now - PAST_WINDOW_MS,
      endMs ?? now + FUTURE_WINDOW_MS,
    );
    set({ events, loaded: true });
    // Every mutation funnels through refresh, so this one hook covers all of them.
    void refreshReminders().catch(() => {});
  },
  eventsForDate: (dateId) => get().events.filter((e) => toDateId(e.dueAt) === dateId),
  create: async (draft) => {
    const row = await insertEvent(draft);
    await get().refresh();
    return row;
  },
  update: async (id, patch) => {
    await patchEvent(id, patch);
    await get().refresh();
  },
  remove: async (id) => {
    await removeEvent(id);
    await get().refresh();
  },
  toggleDone: async (id, done) => {
    await toggleDoneRow(id, done);
    await get().refresh();
  },
}));
