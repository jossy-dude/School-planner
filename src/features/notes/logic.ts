export const NOTE_KINDS = ['teacher_said', 'exam_tip'] as const;

export type NoteKind = (typeof NOTE_KINDS)[number];

export interface NoteDraft {
  courseId: string;
  kind: NoteKind;
  body: string;
  description?: string | null;
}

export type NotePatch = Partial<Omit<NoteDraft, 'courseId'>>;

export function validateNote(input: { kind?: string; body?: string }): { ok: boolean; error?: string } {
  if (!input.body || input.body.trim().length === 0) {
    return { ok: false, error: 'Note is required' };
  }
  if (input.kind !== 'teacher_said' && input.kind !== 'exam_tip') {
    return { ok: false, error: 'Kind must be SAID or TIP' };
  }
  return { ok: true };
}
