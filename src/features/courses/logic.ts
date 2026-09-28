import { Course } from '@/db/schema';

export interface CourseDraft {
  name: string;
  code: string;
  emoji: string;
  color: string;
  pattern: 'dots' | 'stripes' | 'grid';
  credits: number;
  defaultDurationMin: number;
  termId: string | null;
  reminderLeadOverrideMin: number | null;
}

type Input = Partial<CourseDraft>;

export function validateCourse(input: Input):
  | { ok: true; value: CourseDraft }
  | { ok: false; error: string } {
  const name = (input.name ?? '').trim();
  if (!name) return { ok: false, error: 'Name required' };
  const credits = input.credits ?? 1;
  if (!Number.isFinite(credits) || credits < 0) return { ok: false, error: 'Credits must be ≥ 0' };
  const duration = input.defaultDurationMin ?? 60;
  if (!Number.isFinite(duration) || duration < 5) return { ok: false, error: 'Duration must be ≥ 5 min' };
  const patterns = ['dots', 'stripes', 'grid'] as const;
  const pattern = patterns.includes(input.pattern as never) ? input.pattern! : 'dots';
  const color = /^#[0-9A-Fa-f]{6}$/.test(input.color ?? '') ? input.color! : '#141414';
  return {
    ok: true,
    value: {
      name,
      code: (input.code ?? '').trim(),
      emoji: input.emoji?.trim() || '📘',
      color,
      pattern,
      credits,
      defaultDurationMin: duration,
      termId: input.termId ?? null,
      reminderLeadOverrideMin: input.reminderLeadOverrideMin ?? null,
    },
  };
}

export function courseFolderLabel(c: Pick<Course, 'code' | 'name'>): string {
  return c.code ? `${c.code} · ${c.name}` : c.name;
}
