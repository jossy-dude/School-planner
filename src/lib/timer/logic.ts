export type TimerStatus = 'idle' | 'running' | 'paused';

export interface TimerState {
  status: TimerStatus;
  courseId: string | null;
  startedAtMs: number | null;
  remainingMs: number;
  targetMs: number;
}

// Adjudicated (plan AMENDMENT): elapsed derives from remainingMs for ALL statuses.
// nowMs is kept for API symmetry with tick/finished; referenced only as a finite-guard
// so a corrupt clock can never feed the value.
export function elapsedMs(state: TimerState, nowMs: number): number {
  if (!Number.isFinite(nowMs)) return Math.max(0, state.targetMs - state.remainingMs);
  return Math.max(0, state.targetMs - state.remainingMs);
}

// Running only: project the anchor forward, consume elapsed, re-anchor so drift
// doesn't accumulate. Paused/idle: remainingMs is authoritative, state unchanged.
export function tick(state: TimerState, nowMs: number): TimerState {
  if (state.status !== 'running' || state.startedAtMs === null) return state;
  const delta = nowMs - state.startedAtMs;
  if (delta <= 0) return state; // no time travel: never re-anchor backwards
  const remainingMs = Math.max(0, state.remainingMs - delta);
  return { ...state, remainingMs, startedAtMs: nowMs };
}

// Running: project forward from the anchor (catches expiry between 1s ticks).
// Paused/idle: remainingMs is frozen and authoritative.
export function finished(state: TimerState, nowMs: number): boolean {
  if (state.status === 'running' && state.startedAtMs !== null) {
    return Math.max(0, state.remainingMs - Math.max(0, nowMs - state.startedAtMs)) <= 0;
  }
  return state.remainingMs <= 0;
}

export function progressOf(state: TimerState): number {
  if (state.targetMs <= 0) return state.remainingMs <= 0 ? 1 : 0;
  const ratio = (state.targetMs - state.remainingMs) / state.targetMs;
  return Math.min(1, Math.max(0, ratio));
}

// Display projection: smooth countdown between 1s ticks (running), frozen otherwise.
export function remainingAt(state: TimerState, nowMs: number): number {
  if (state.status !== 'running' || state.startedAtMs === null) return state.remainingMs;
  return Math.max(0, state.remainingMs - Math.max(0, nowMs - state.startedAtMs));
}

export function startState(courseId: string | null, targetMs: number, nowMs: number): TimerState {
  return { status: 'running', courseId, startedAtMs: nowMs, remainingMs: targetMs, targetMs };
}

export function pauseState(state: TimerState, nowMs: number): TimerState {
  if (state.status !== 'running') return state;
  return { ...state, status: 'paused', remainingMs: remainingAt(state, nowMs) };
}

export function resumeState(state: TimerState, nowMs: number): TimerState {
  if (state.status !== 'paused') return state;
  return { ...state, status: 'running', startedAtMs: nowMs };
}

export function resetState(state: TimerState): TimerState {
  return { ...state, status: 'idle', startedAtMs: null, remainingMs: state.targetMs };
}
