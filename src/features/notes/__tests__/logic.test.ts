import { validateNote } from '../logic';

it('rejects empty and whitespace-only bodies', () => {
  expect(validateNote({ kind: 'teacher_said', body: '' }).ok).toBe(false);
  expect(validateNote({ kind: 'teacher_said', body: '   \n\t' }).ok).toBe(false);
});

it('rejects a kind outside the enum and a missing kind', () => {
  expect(validateNote({ kind: 'grocery_list', body: 'exam Friday' }).ok).toBe(false);
  expect(validateNote({ body: 'exam Friday' }).ok).toBe(false);
});

it('accepts a non-empty body for both kinds', () => {
  expect(validateNote({ kind: 'teacher_said', body: 'exam is Friday' }).ok).toBe(true);
  expect(validateNote({ kind: 'exam_tip', body: 'revise ch.3 first' }).ok).toBe(true);
});

it('returns an error message alongside ok:false', () => {
  const r = validateNote({ kind: 'teacher_said', body: '  ' });
  expect(r.ok).toBe(false);
  expect(typeof r.error).toBe('string');
});
