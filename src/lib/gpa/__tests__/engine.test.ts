import {
  computeGpa, courseFinalPct, neededOnFinal, pointsForPct, sortScaleRows, targetGpaNeeded, validateScale,
} from '../index';

const scale = { id: 's', name: '4.0', rows: [
  { letter: 'A', minPct: 90, points: 4 },
  { letter: 'B', minPct: 80, points: 3 },
  { letter: 'C', minPct: 70, points: 2 },
  { letter: 'D', minPct: 60, points: 1 },
  { letter: 'F', minPct: 0, points: 0 },
] };

it('validateScale catches duplicates, order, bounds', () => {
  expect(validateScale(scale.rows).ok).toBe(true);
  expect(validateScale([...scale.rows, { letter: 'A', minPct: 50, points: 3.5 }]).ok).toBe(false); // dup letter
  expect(validateScale([{ letter: 'A', minPct: 90, points: 4 }, { letter: 'B', minPct: 95, points: 3 }]).ok).toBe(false); // not descending
  expect(validateScale([]).ok).toBe(false);
  expect(validateScale([{ letter: 'A', minPct: 101, points: 4 }]).ok).toBe(false);
});

it('validateScale returns ALL errors, case-insensitive duplicate letters', () => {
  const r = validateScale([{ letter: 'A', minPct: -5, points: -1 }, { letter: 'a', minPct: 50, points: 2 }]);
  expect(r.ok).toBe(false);
  expect(r.errors.length).toBeGreaterThanOrEqual(3);
});

it('sortScaleRows sorts desc by minPct without mutating input', () => {
  const input = [{ letter: 'B', minPct: 80, points: 3 }, { letter: 'A', minPct: 90, points: 4 }, { letter: 'F', minPct: 0, points: 0 }];
  const sorted = sortScaleRows(input);
  expect(sorted.map((row) => row.letter)).toEqual(['A', 'B', 'F']);
  expect(input.map((row) => row.letter)).toEqual(['B', 'A', 'F']);
});

it('courseFinalPct weights by override and ignores empty', () => {
  expect(courseFinalPct([{ score: 8, maxScore: 10, weightOverride: null }, { score: 18, maxScore: 20, weightOverride: null }])).toBeCloseTo(85); // AMENDED: (0.8+0.9)/2 = 85 (plan commit 48ead76)
  expect(courseFinalPct([{ score: 50, maxScore: 100, weightOverride: 3 }, { score: 90, maxScore: 100, weightOverride: 1 }])).toBeCloseTo(60);
  expect(courseFinalPct([])).toBeNull();
});

it('courseFinalPct skips grades with maxScore 0', () => {
  expect(courseFinalPct([{ score: 5, maxScore: 0, weightOverride: null }, { score: 8, maxScore: 10, weightOverride: null }])).toBeCloseTo(80);
});

it('pointsForPct interpolates between bounds', () => {
  expect(pointsForPct(95, scale)).toBeCloseTo(4);
  expect(pointsForPct(85, scale)).toBeCloseTo(3.5);
  expect(pointsForPct(5, scale)).toBeCloseTo(5 / 60, 5); // AMENDED: F-band → D@60 ceiling: 5/60
  expect(pointsForPct(45, scale)).toBeCloseTo(0.75, 5);
  expect(pointsForPct(0, scale)).toBeCloseTo(0);
});

it('pointsForPct interpolates toward the next-HIGHER row on a non-uniform scale', () => {
  const nonUniform = { id: 'n', name: 'non-uniform', rows: [
    { letter: 'A', minPct: 90, points: 4 },
    { letter: 'B', minPct: 85, points: 3.8 },
  ] };
  expect(pointsForPct(87.5, nonUniform)).toBeCloseTo(3.9);
  expect(pointsForPct(85, nonUniform)).toBeCloseTo(3.8);
  expect(pointsForPct(92, nonUniform)).toBeCloseTo(4);
  expect(pointsForPct(70, nonUniform)).toBeCloseTo(3.8); // below all mins → lowest row points
});

it('computeGpa credit-weights and excludes', () => {
  const r = computeGpa([
    { id: '1', credits: 3, finalPct: 95, excluded: false },
    { id: '2', credits: 4, finalPct: 85, excluded: false },
    { id: '3', credits: 5, finalPct: 70, excluded: true },
  ], scale, 2);
  expect(r.gpa).toBeCloseTo(3.71, 2); // AMENDED: (4*3 + 3.5*4) / 7 = 3.714… (plan commit 48ead76)
  expect(r.totalCredits).toBe(7);
  expect(r.includedCount).toBe(2);
});

it('computeGpa empty → null', () => {
  expect(computeGpa([], scale, 2).gpa).toBeNull();
});

it('computeGpa clamps rounding to 0–3 decimals', () => {
  const courses = [
    { id: '1', credits: 3, finalPct: 95, excluded: false },
    { id: '2', credits: 4, finalPct: 85, excluded: false },
  ];
  expect(computeGpa(courses, scale, 0).gpa).toBe(4);
  expect(computeGpa(courses, scale, 1).gpa).toBe(3.7);
  expect(computeGpa(courses, scale, 2).gpa).toBe(3.71);
  expect(computeGpa(courses, scale, 3).gpa).toBe(3.714);
  expect(computeGpa(courses, scale, 99).gpa).toBe(3.714); // clamped to 3
});

it('targetGpaNeeded solves remaining credits', () => {
  const needed = targetGpaNeeded([
    { id: '1', credits: 4, finalPct: 95, excluded: false }, // points 4.0 → 16
    { id: '2', credits: 4, finalPct: null, excluded: false },
  ], scale, 3.5);
  // (3.5*8 - 16) / 4 = 3.0
  expect(needed).toBeCloseTo(3);
});

it('targetGpaNeeded returns null when no remaining credits', () => {
  expect(targetGpaNeeded([{ id: '1', credits: 4, finalPct: 95, excluded: false }], scale, 3.5)).toBeNull();
  expect(targetGpaNeeded([{ id: '1', credits: 4, finalPct: null, excluded: true }], scale, 3.5)).toBeNull();
});

it('neededOnFinal bands', () => {
  const safe = neededOnFinal({ currentPct: 85, finalWeight: 0.3, targetPct: 80 });
  expect(safe.neededPct).toBeCloseTo(68.33, 2); // repeating decimal 68.333… → per-field (plan note under test block)
  expect(safe.band).toBe('safe');
  expect(neededOnFinal({ currentPct: 85, finalWeight: 0.3, targetPct: 95 }).band).toBe('impossible'); // 118.3
  expect(neededOnFinal({ currentPct: 88, finalWeight: 0.5, targetPct: 94 })).toEqual({ neededPct: 100, band: 'borderline' });
});

it('neededOnFinal returns impossible with 0 for weight ≤ 0', () => {
  expect(neededOnFinal({ currentPct: 85, finalWeight: 0, targetPct: 90 })).toEqual({ neededPct: 0, band: 'impossible' });
  expect(neededOnFinal({ currentPct: 85, finalWeight: -0.3, targetPct: 90 })).toEqual({ neededPct: 0, band: 'impossible' });
});

it('neededOnFinal computes normally for weight > 1 (valid domain note: (0,1] but >1 not rejected)', () => {
  const r = neededOnFinal({ currentPct: 85, finalWeight: 1.5, targetPct: 90 });
  expect(r.neededPct).toBeCloseTo(88.33, 2); // (90 - 85*(1-1.5)) / 1.5 = 88.333…
  expect(r.band).toBe('borderline');
});
