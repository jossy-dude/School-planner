export function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00';
  if (ms >= 86_400_000) return '>1D';
  if (ms >= 3_600_000) {
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return `${h}H ${String(m).padStart(2, '0')}M`;
  }
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
export function formatClock(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(h)}:${p(m)}:${p(s)}`;
}
// 24h "HH:MM", matching the app's digital-clock aesthetic (no AM/PM chrome).
export function formatTimeOfDay(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}
// A duration given in minutes, as "1h 20m" / "45m" / "3h".
export function formatDurationMin(totalMin: number): string {
  const clamped = Math.max(0, Math.round(totalMin));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
