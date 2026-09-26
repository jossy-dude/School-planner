export function isValidTime(v: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(v)) return false;
  const [h, m] = v.split(':').map(Number);
  return h! < 24 && m! < 60;
}
export function normalizeTime(v: string): string {
  if (v.includes(':')) {
    const [hs = '', ms = ''] = v.split(':');
    const pad = (s: string) => s.replace(/\D/g, '').slice(0, 2).padStart(2, '0');
    return `${pad(hs)}:${pad(ms)}`;
  }
  const digits = v.replace(/\D/g, '').slice(0, 4);
  if (digits.length === 0) return '';
  if (digits.length <= 2) {
    const h = (digits[0] ?? '0').padStart(2, '0');
    const m = (digits[1] ?? '0').padStart(2, '0');
    return `${h}:${m}`;
  }
  return `${digits.slice(0, 2)}:${digits.slice(2, 4).padStart(2, '0')}`;
}

const DATE_ID_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateId(v: string): boolean {
  return DATE_ID_RE.test(v);
}

export interface PatternDraft {
  id?: string;
  courseId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  location?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
}

export interface ExceptionDraft {
  id?: string;
  courseId: string;
  patternId?: string | null;
  date: string;
  kind: 'one_off' | 'cancelled';
  startTime?: string | null;
  endTime?: string | null;
}

export function validatePattern(input: {
  weekday: number;
  startTime: string;
  endTime: string;
  location?: string;
  validFrom?: string;
  validTo?: string;
}): { ok: true; value: Omit<PatternDraft, 'id' | 'courseId'> } | { ok: false; error: string } {
  if (!isValidTime(input.startTime) || !isValidTime(input.endTime)) {
    return { ok: false, error: 'Enter valid start and end times (00:00–23:59)' };
  }
  if (input.startTime === input.endTime) {
    return { ok: false, error: 'Start and end must differ' };
  }
  const validFrom = (input.validFrom ?? '').trim();
  const validTo = (input.validTo ?? '').trim();
  if (validFrom && !isValidDateId(validFrom)) {
    return { ok: false, error: 'Valid from must be YYYY-MM-DD' };
  }
  if (validTo && !isValidDateId(validTo)) {
    return { ok: false, error: 'Valid to must be YYYY-MM-DD' };
  }
  return {
    ok: true,
    value: {
      weekday: input.weekday,
      startTime: input.startTime,
      endTime: input.endTime,
      location: (input.location ?? '').trim() || null,
      validFrom: validFrom || null,
      validTo: validTo || null,
    },
  };
}

export function validateException(input: { date?: string; kind?: string }): { ok: boolean; error?: string } {
  if (!isValidDateId((input.date ?? '').trim())) {
    return { ok: false, error: 'Date must be YYYY-MM-DD' };
  }
  if (input.kind !== 'cancelled' && input.kind !== 'one_off') {
    return { ok: false, error: 'Kind must be CANCELLED or EXTRA' };
  }
  return { ok: true };
}
