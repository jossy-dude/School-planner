import { GpaScale } from '@/db/schema';
import { Scale, sortScaleRows } from '@/lib/gpa';

// Built-in 4.0 scale: used when gpa_scale_id is null or points at a deleted row.
export const DEFAULT_SCALE: Scale = {
  id: 'default-4.0',
  name: '4.0',
  rows: [
    { letter: 'A', minPct: 90, points: 4 },
    { letter: 'B', minPct: 80, points: 3 },
    { letter: 'C', minPct: 70, points: 2 },
    { letter: 'D', minPct: 60, points: 1 },
    { letter: 'F', minPct: 0, points: 0 },
  ],
};

export function activeScale(scales: GpaScale[], scaleId: string | null): Scale {
  const match = scaleId === null ? undefined : scales.find((s) => s.id === scaleId);
  if (!match) return DEFAULT_SCALE;
  return { id: match.id, name: match.name, rows: sortScaleRows(match.rows) };
}

// Target points for a letter: exact row in the active scale first,
// else PASS = lowest non-F row, else the 4.0-system fallback for A/B/C (1 for PASS).
export function targetPointsFor(letter: string, scale: Scale): number {
  const key = letter.trim().toUpperCase();
  const rows = sortScaleRows(scale.rows);
  const exact = rows.find((r) => r.letter.trim().toUpperCase() === key);
  if (exact) return exact.points;
  if (key === 'PASS') {
    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i];
      if (row && row.letter.trim().toUpperCase() !== 'F') return row.points;
    }
    return 1;
  }
  if (key === 'A') return 4;
  if (key === 'B') return 3;
  if (key === 'C') return 2;
  return 0;
}

// Lowest minPct of the row whose letter is "A" — the default final-exam target.
export function defaultTargetPct(scale: Scale): number {
  const rows = sortScaleRows(scale.rows);
  const aRow = rows.find((r) => r.letter.trim().toUpperCase() === 'A');
  return aRow ? aRow.minPct : 90;
}

export type TargetLetter = 'A' | 'B' | 'C' | 'PASS';

export const TARGET_LETTERS: TargetLetter[] = ['A', 'B', 'C', 'PASS'];
