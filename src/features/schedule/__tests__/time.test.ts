import { normalizeTime, isValidTime, patternLabel, validateException } from '../logic';
it('validates HH:MM', () => {
  expect(isValidTime('09:00')).toBe(true);
  expect(isValidTime('23:59')).toBe(true);
  expect(isValidTime('24:00')).toBe(false);
  expect(isValidTime('9:0')).toBe(false);
});
it('normalize pads input', () => {
  expect(normalizeTime('95')).toBe('09:05');
  expect(normalizeTime('')).toBe('');
});

describe('validateException', () => {
  it('rejects a malformed date', () => {
    expect(validateException({ date: '2026-9-28', kind: 'cancelled' })).toEqual({
      ok: false,
      error: 'Date must be YYYY-MM-DD',
    });
    expect(validateException({ date: 'not-a-date', kind: 'cancelled' }).ok).toBe(false);
    expect(validateException({ date: '', kind: 'cancelled' }).ok).toBe(false);
  });

  it('rejects an unknown kind', () => {
    expect(validateException({ date: '2026-09-28', kind: 'one-off' })).toEqual({
      ok: false,
      error: 'Kind must be CANCELLED or EXTRA',
    });
    expect(validateException({ date: '2026-09-28' }).ok).toBe(false);
  });

  it('accepts a cancelled exception bound to a pattern', () => {
    expect(validateException({ date: '2026-09-28', kind: 'cancelled', patternId: 'p1' })).toEqual({ ok: true });
  });

  it('accepts a one_off exception carrying both times', () => {
    expect(validateException({ date: '2026-09-28', kind: 'one_off', startTime: '14:00', endTime: '15:00' }))
      .toEqual({ ok: true });
  });

  it('rejects a cancelled exception with no pattern bound', () => {
    expect(validateException({ date: '2026-09-28', kind: 'cancelled' })).toEqual({
      ok: false,
      error: 'Pick the class to cancel',
    });
    expect(validateException({ date: '2026-09-28', kind: 'cancelled', patternId: null }).ok).toBe(false);
    expect(validateException({ date: '2026-09-28', kind: 'cancelled', patternId: '' }).ok).toBe(false);
  });

  it('rejects a one_off with missing or malformed times', () => {
    const times = { date: '2026-09-28', kind: 'one_off' };
    expect(validateException(times)).toEqual({
      ok: false,
      error: 'Enter valid start and end times (00:00–23:59)',
    });
    expect(validateException({ ...times, startTime: '14:00' }).ok).toBe(false);
    expect(validateException({ ...times, endTime: '15:00' }).ok).toBe(false);
    expect(validateException({ ...times, startTime: '9:0', endTime: '15:00' }).ok).toBe(false);
    expect(validateException({ ...times, startTime: '14:00', endTime: '24:00' }).ok).toBe(false);
  });

  it('allows an overnight one_off when the end is at or before the start', () => {
    expect(validateException({
      date: '2026-09-28', kind: 'one_off', startTime: '22:00', endTime: '01:00',
    })).toEqual({ ok: true });
    expect(validateException({
      date: '2026-09-28', kind: 'one_off', startTime: '22:00', endTime: '22:00',
    }).ok).toBe(true);
  });
});

describe('patternLabel', () => {
  it('renders weekday short name plus the class window', () => {
    expect(patternLabel({ weekday: 1, startTime: '08:00', endTime: '09:30' })).toBe('MON 08:00–09:30');
    expect(patternLabel({ weekday: 0, startTime: '23:00', endTime: '00:30' })).toBe('SUN 23:00–00:30');
  });

  it('falls back to a placeholder for an unknown weekday', () => {
    expect(patternLabel({ weekday: 9, startTime: '08:00', endTime: '09:30' })).toBe('? 08:00–09:30');
  });
});
