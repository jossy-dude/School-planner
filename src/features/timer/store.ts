import { create } from 'zustand';
import * as Haptics from 'expo-haptics';
import { StudySession } from '@/db/schema';
import {
  elapsedMs,
  finished,
  pauseState,
  resetState,
  resumeState,
  startState,
  tick as tickLogic,
  TimerState,
} from '@/lib/timer/logic';
import { insertSession, listSessions } from './queries';

interface TimerActions {
  start: (courseId: string | null, targetMs: number) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  finish: () => Promise<void>;
  tick: (nowMs: number) => Promise<void>;
  refreshSessions: () => Promise<void>;
  // Idle selection: chips/picker write here so the arc previews the next session.
  select: (courseId: string | null) => void;
  setDuration: (targetMs: number) => void;
  dismissCelebration: () => void;
}

export interface Celebration {
  minutes: number;
  /** true = countdown auto-finished; false = manual ■ finish that logged a row. */
  auto: boolean;
}

interface TimerStore {
  state: TimerState;
  nowMs: number;
  sessions: StudySession[];
  sessionStartMs: number | null;
  finishing: boolean;
  celebration: Celebration | null;
  actions: TimerActions;
}

const DEFAULT_TARGET_MS = 25 * 60_000;

async function logSession(courseId: string | null, startedAtMs: number, durationMin: number): Promise<void> {
  try {
    await insertSession(courseId, new Date(startedAtMs), durationMin);
  } catch {
    // A failed row must not strand the countdown at zero.
  }
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  state: { status: 'idle', courseId: null, startedAtMs: null, remainingMs: DEFAULT_TARGET_MS, targetMs: DEFAULT_TARGET_MS },
  nowMs: 0,
  sessions: [],
  sessionStartMs: null,
  finishing: false,
  celebration: null,
  actions: {
    start: (courseId, targetMs) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const now = Date.now();
      set({ state: startState(courseId, targetMs, now), nowMs: now, sessionStartMs: now, celebration: null });
    },
    pause: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      set({ state: pauseState(get().state, Date.now()), nowMs: Date.now() });
    },
    resume: () => set({ state: resumeState(get().state, Date.now()), nowMs: Date.now() }),
    reset: () => set({ state: resetState(get().state), sessionStartMs: null, nowMs: Date.now(), celebration: null }),
    dismissCelebration: () => set({ celebration: null }),
    select: (courseId) => {
      if (get().state.status !== 'idle') return;
      set({ state: { ...get().state, courseId } });
    },
    setDuration: (targetMs) => {
      const s = get().state;
      if (s.status !== 'idle') return;
      set({ state: { ...s, targetMs, remainingMs: targetMs } });
    },
    finish: async () => {
      const s = get().state;
      if (s.status === 'idle' || get().finishing) return;
      set({ finishing: true });
      const now = Date.now();
      const startedAtMs = get().sessionStartMs ?? now - elapsedMs(s, now);
      const elapsed = elapsedMs(s, now);
      // Gate on the wall-clock minute BEFORE rounding, so a 45s press
      // (round → 1) never becomes a phantom 1-minute row — and only a logged
      // row earns the mascot moment (manual < 60 s → celebration stays null).
      const logged = elapsed >= 60_000;
      const minutes = Math.max(1, Math.round(elapsed / 60_000));
      set({
        state: resetState(s),
        sessionStartMs: null,
        nowMs: now,
        celebration: logged ? { minutes, auto: false } : null,
      });
      if (logged) {
        await logSession(s.courseId, startedAtMs, minutes);
        await get().actions.refreshSessions();
      }
      set({ finishing: false });
    },
    tick: async (nowMs) => {
      const s = get().state;
      set({ nowMs });
      if (s.status !== 'running' || get().finishing) return;
      const next = tickLogic(s, nowMs);
      set({ state: next });
      if (!finished(next, nowMs)) return;
      // Countdown hit zero: persist the full target, celebrate, then re-arm.
      set({ finishing: true });
      const startedAtMs = get().sessionStartMs ?? nowMs;
      const minutes = Math.round(next.targetMs / 60_000);
      await logSession(next.courseId, startedAtMs, minutes);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      set({
        state: resetState(next),
        sessionStartMs: null,
        finishing: false,
        nowMs,
        celebration: { minutes, auto: true },
      });
      await get().actions.refreshSessions();
    },
    refreshSessions: async () => {
      try {
        set({ sessions: await listSessions(10) });
      } catch {
        // Keep the last list on a transient read failure.
      }
    },
  },
}));
