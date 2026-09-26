import { normalizeTime, isValidTime, validateException } from '../logic';
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

  it('accepts both kinds on a well-formed date', () => {
    expect(validateException({ date: '2026-09-28', kind: 'cancelled' })).toEqual({ ok: true });
    expect(validateException({ date: '2026-09-28', kind: 'one_off' })).toEqual({ ok: true });
  });
});
