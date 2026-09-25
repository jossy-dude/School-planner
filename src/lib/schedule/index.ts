export interface PatternInput { id: string; courseId: string; weekday: number; startTime: string; endTime: string; validFrom?: string | null; validTo?: string | null; }
export interface ExceptionInput { id: string; courseId: string; patternId?: string | null; date: string; kind: 'one_off' | 'cancelled'; startTime?: string | null; endTime?: string | null; }
export interface Occurrence {
  id: string; courseId: string; dateId: string;
  startMs: number; endMs: number; patternId: string | null; kind: 'pattern' | 'one_off';
}

export function toDateId(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function parseDateId(dateId: string): Date {
  const [y, m, d] = dateId.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

function timeOnDay(dateId: string, hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return parseDateId(dateId).getTime() + (h ?? 0) * 3600_000 + (m ?? 0) * 60_000;
}

function weekdayOf(dateId: string): number {
  return parseDateId(dateId).getDay();
}

function inWindow(dateId: string, from?: string | null, to?: string | null): boolean {
  if (from && dateId < from) return false;
  if (to && dateId > to) return false;
  return true;
}

export function occurrencesOnDay(
  patterns: PatternInput[], exceptions: ExceptionInput[], dateId: string,
): Occurrence[] {
  const out: Occurrence[] = [];
  const cancelled = new Set(
    exceptions.filter((e) => e.date === dateId && e.kind === 'cancelled' && e.patternId)
      .map((e) => e.patternId!),
  );
  for (const p of patterns) {
    if (weekdayOf(dateId) !== p.weekday) continue;
    if (!inWindow(dateId, p.validFrom, p.validTo)) continue;
    if (cancelled.has(p.id)) continue;
    const startMs = timeOnDay(dateId, p.startTime);
    const endMsRaw = timeOnDay(dateId, p.endTime);
    const endMs = endMsRaw > startMs ? endMsRaw : endMsRaw + 86_400_000;
    out.push({ id: `${p.id}:${dateId}`, courseId: p.courseId, dateId, startMs, endMs, patternId: p.id, kind: 'pattern' });
  }
  for (const e of exceptions) {
    if (e.date !== dateId || e.kind !== 'one_off') continue;
    if (!e.startTime || !e.endTime) continue;
    const startMs = timeOnDay(dateId, e.startTime);
    const endMsRaw = timeOnDay(dateId, e.endTime);
    const endMs = endMsRaw > startMs ? endMsRaw : endMsRaw + 86_400_000;
    out.push({ id: `oneoff:${e.id}`, courseId: e.courseId, dateId, startMs, endMs, patternId: null, kind: 'one_off' });
  }
  return out.sort((a, b) => a.startMs - b.startMs);
}

export function occurrencesInRange(
  patterns: PatternInput[], exceptions: ExceptionInput[], rangeStartMs: number, rangeEndMs: number,
): Occurrence[] {
  const out: Occurrence[] = [];
  const cur = new Date(rangeStartMs);
  cur.setHours(0, 0, 0, 0);
  while (cur.getTime() <= rangeEndMs) {
    out.push(...occurrencesOnDay(patterns, exceptions, toDateId(cur)));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function classifySessionState(nowMs: number, occ: Occurrence): 'upcoming' | 'active' | 'ended' {
  if (nowMs < occ.startMs) return 'upcoming';
  if (nowMs < occ.endMs) return 'active';
  return 'ended';
}
