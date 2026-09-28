export const FILE_CATEGORIES = ['materials', 'assignments', 'submissions', 'other'] as const;

export type FileCategory = (typeof FILE_CATEGORIES)[number];

export const CATEGORY_LABEL: Record<FileCategory, string> = {
  materials: 'MATERIALS',
  assignments: 'ASSIGNMENTS',
  submissions: 'SUBMISSIONS',
  other: 'OTHER',
};

export interface FileDraft {
  courseId: string | null;
  category: FileCategory;
  name: string;
  sandboxUri: string;
  size: number;
  mime: string | null;
  description?: string | null;
}

export function isFileCategory(v: unknown): v is FileCategory {
  return typeof v === 'string' && (FILE_CATEGORIES as readonly string[]).includes(v);
}

export function validateFile(input: { name?: string; sandboxUri?: string; category?: string }):
  { ok: true } | { ok: false; error: string } {
  if (!input.name || input.name.trim().length === 0) return { ok: false, error: 'Name required' };
  if (!input.sandboxUri || input.sandboxUri.trim().length === 0) return { ok: false, error: 'No file chosen' };
  if (!isFileCategory(input.category)) return { ok: false, error: 'Invalid category' };
  return { ok: true };
}

// Binary units: these are on-device storage sizes, not network transfer.
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const digits = value < 10 ? 1 : 0;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

const EXT_GLYPHS: [RegExp, string][] = [
  [/\.pdf$/i, '▤'],
  [/\.(docx?|pages)$/i, '▥'],
  [/\.(xlsx?|csv|numbers)$/i, '▦'],
  [/\.(pptx?|key)$/i, '▧'],
  [/\.(png|jpe?g|gif|webp|heic|heif)$/i, '▨'],
  [/\.(mp4|mov|mkv|webm)$/i, '▶'],
  [/\.(mp3|wav|m4a)$/i, '♪'],
  [/\.(zip|rar|7z)$/i, '▩'],
];

export function fileGlyph(name: string): string {
  for (const [pattern, glyph] of EXT_GLYPHS) {
    if (pattern.test(name)) return glyph;
  }
  return '▤';
}

// A short, collision-resistant, filesystem-safe name for the copy kept in app
// storage: the picker's original name stays human-readable in the UI (the `name`
// column), this is only ever used as the on-disk file name.
export function sandboxFileName(id: string, originalName: string): string {
  const dot = originalName.lastIndexOf('.');
  const ext = dot >= 0 ? originalName.slice(dot) : '';
  return `${id}${ext}`;
}
