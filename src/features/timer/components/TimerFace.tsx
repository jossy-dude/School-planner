import { formatCountdown } from '@/lib/format';
import { remainingAt, TimerState } from '@/lib/timer/logic';
import { DotArcClock } from '@/ui/DotArcClock';

interface Props { state: TimerState; nowMs: number; }

// Between 1s ticks the display projects from the anchor so the countdown
// never shows a stale second (running only; paused/idle remaining is frozen).
export function TimerFace({ state, nowMs }: Props) {
  const remaining = remainingAt(state, nowMs);
  return <DotArcClock remainingMs={remaining} totalMs={state.targetMs} label={formatCountdown(remaining)} />;
}
