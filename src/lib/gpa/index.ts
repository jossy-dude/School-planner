export interface ScaleRow { letter: string; minPct: number; points: number }
export interface Scale { id: string; name: string; rows: ScaleRow[] } // rows sorted by minPct desc
export interface CourseInput { id: string; credits: number; finalPct: number | null; excluded: boolean }
export interface GradeRow { score: number; maxScore: number; weightOverride: number | null }

export interface ScaleValidation { ok: boolean; errors: string[] }
export interface GpaResult { gpa: number | null; totalCredits: number; includedCount: number }
export interface NeededOnFinalResult { neededPct: number; band: 'safe' | 'borderline' | 'impossible' }

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundTo(value: number, decimals: number): number {
  const d = Number.isFinite(decimals) ? clamp(Math.trunc(decimals), 0, 3) : 0;
  const factor = 10 ** d;
  return Math.round(value * factor) / factor;
}

export function sortScaleRows(rows: ScaleRow[]): ScaleRow[] {
  return [...rows].sort((a, b) => b.minPct - a.minPct);
}

export function validateScale(rows: ScaleRow[]): ScaleValidation {
  const errors: string[] = [];
  if (rows.length === 0) errors.push('scale must have at least one row');
  const seen = new Set<string>();
  for (const row of rows) {
    const key = row.letter.toLowerCase();
    if (seen.has(key)) errors.push(`duplicate letter "${row.letter}"`);
    seen.add(key);
    if (!Number.isFinite(row.minPct) || row.minPct < 0 || row.minPct > 100) {
      errors.push(`minPct must be a finite number in 0–100 for row "${row.letter}"`);
    }
    if (!Number.isFinite(row.points) || row.points < 0) {
      errors.push(`points must be a finite number >= 0 for row "${row.letter}"`);
    }
  }
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1];
    const cur = rows[i];
    if (!prev || !cur) continue;
    if (!(prev.minPct > cur.minPct)) {
      errors.push(`minPct must be strictly descending as given: "${prev.letter}" (${prev.minPct}) then "${cur.letter}" (${cur.minPct})`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export function courseFinalPct(grades: GradeRow[]): number | null {
  let weighted = 0;
  let weightSum = 0;
  for (const grade of grades) {
    if (grade.maxScore === 0) continue;
    const w = grade.weightOverride ?? 1;
    weighted += (grade.score / grade.maxScore) * w;
    weightSum += w;
  }
  if (weightSum === 0) return null;
  return (weighted / weightSum) * 100;
}

export function pointsForPct(pct: number, scale: Scale): number {
  const rows = sortScaleRows(scale.rows);
  const top = rows[0];
  if (!top) return 0;
  if (pct >= top.minPct) return Math.max(top.points, 0);

  let floorIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row && row.minPct <= pct) {
      floorIdx = i;
      break;
    }
  }

  if (floorIdx < 0) {
    const lowest = rows[rows.length - 1];
    return Math.max(lowest ? lowest.points : 0, 0);
  }

  const floorRow = rows[floorIdx];
  const ceilRow = rows[floorIdx - 1];
  if (!floorRow || !ceilRow) return Math.max(floorRow ? floorRow.points : 0, 0);
  const span = ceilRow.minPct - floorRow.minPct;
  if (span === 0) return Math.max(floorRow.points, 0);
  const t = (pct - floorRow.minPct) / span;
  return Math.max(floorRow.points + t * (ceilRow.points - floorRow.points), 0);
}

export function computeGpa(courses: CourseInput[], scale: Scale, rounding: number): GpaResult {
  let pointsSum = 0;
  let totalCredits = 0;
  let includedCount = 0;
  for (const course of courses) {
    if (course.excluded || course.finalPct === null || course.credits <= 0) continue;
    pointsSum += pointsForPct(course.finalPct, scale) * course.credits;
    totalCredits += course.credits;
    includedCount += 1;
  }
  if (includedCount === 0) return { gpa: null, totalCredits: 0, includedCount: 0 };
  return { gpa: roundTo(pointsSum / totalCredits, rounding), totalCredits, includedCount };
}

export function targetGpaNeeded(courses: CourseInput[], scale: Scale, target: number): number | null {
  let donePoints = 0;
  let doneCredits = 0;
  let remCredits = 0;
  for (const course of courses) {
    if (course.excluded || course.credits <= 0) continue;
    if (course.finalPct === null) {
      remCredits += course.credits;
    } else {
      donePoints += pointsForPct(course.finalPct, scale) * course.credits;
      doneCredits += course.credits;
    }
  }
  if (remCredits <= 0) return null;
  return (target * (doneCredits + remCredits) - donePoints) / remCredits;
}

export function neededOnFinal(input: { currentPct: number; finalWeight: number; targetPct: number }): NeededOnFinalResult {
  const { currentPct, finalWeight, targetPct } = input;
  if (!(finalWeight > 0) || !Number.isFinite(finalWeight)) return { neededPct: 0, band: 'impossible' };
  if (!Number.isFinite(currentPct) || !Number.isFinite(targetPct)) return { neededPct: 0, band: 'impossible' };
  const neededPct = (targetPct - currentPct * (1 - finalWeight)) / finalWeight;
  if (!Number.isFinite(neededPct)) return { neededPct: 0, band: 'impossible' };
  const band = neededPct <= 70 ? 'safe' : neededPct <= 100 ? 'borderline' : 'impossible';
  return { neededPct, band };
}
