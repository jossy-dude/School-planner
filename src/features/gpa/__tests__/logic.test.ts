import { GpaScale } from '@/db/schema';
import { DEFAULT_SCALE, activeScale, defaultTargetPct, targetPointsFor } from '../logic';

const dbScale = {
  id: 'sc1',
  name: '5.0',
  rows: [
    { letter: 'A', minPct: 90, points: 5 },
    { letter: 'B', minPct: 80, points: 4 },
    { letter: 'F', minPct: 0, points: 0 },
  ],
  isDefault: true,
  updatedAt: new Date(),
} as GpaScale;

it('DEFAULT_SCALE is the 4.0 ladder', () => {
  expect(DEFAULT_SCALE.id).toBe('default-4.0');
  expect(DEFAULT_SCALE.name).toBe('4.0');
  expect(DEFAULT_SCALE.rows).toEqual([
    { letter: 'A', minPct: 90, points: 4 },
    { letter: 'B', minPct: 80, points: 3 },
    { letter: 'C', minPct: 70, points: 2 },
    { letter: 'D', minPct: 60, points: 1 },
    { letter: 'F', minPct: 0, points: 0 },
  ]);
});

it('activeScale prefers the matching DB scale, else DEFAULT_SCALE', () => {
  expect(activeScale([dbScale], 'sc1')).toEqual({ id: 'sc1', name: '5.0', rows: dbScale.rows });
  expect(activeScale([dbScale], null)).toBe(DEFAULT_SCALE);
  expect(activeScale([dbScale], 'deleted-id')).toBe(DEFAULT_SCALE);
  expect(activeScale([], 'sc1')).toBe(DEFAULT_SCALE);
});

it('targetPointsFor uses the active scale row first', () => {
  expect(targetPointsFor('A', DEFAULT_SCALE)).toBe(4);
  expect(targetPointsFor('B', DEFAULT_SCALE)).toBe(3);
  expect(targetPointsFor('a', DEFAULT_SCALE)).toBe(4);
  expect(targetPointsFor('A', { id: 'x', name: '5.0', rows: dbScale.rows })).toBe(5);
});

it('targetPointsFor falls back per the resolution when the letter is absent', () => {
  const noAbc = { id: 'x', name: 'pass-fail', rows: [{ letter: 'P', minPct: 70, points: 1 }] };
  expect(targetPointsFor('A', noAbc)).toBe(4);
  expect(targetPointsFor('B', noAbc)).toBe(3);
  expect(targetPointsFor('C', noAbc)).toBe(2);
  expect(targetPointsFor('PASS', noAbc)).toBe(1);
  expect(targetPointsFor('Q', DEFAULT_SCALE)).toBe(0);
});

it('PASS resolves to the lowest non-F row of the active scale', () => {
  expect(targetPointsFor('PASS', DEFAULT_SCALE)).toBe(1);
  const passRow = {
    id: 'x',
    name: 'p',
    rows: [
      { letter: 'A', minPct: 90, points: 4 },
      { letter: 'PASS', minPct: 60, points: 2 },
      { letter: 'F', minPct: 0, points: 0 },
    ],
  };
  expect(targetPointsFor('PASS', passRow)).toBe(2);
  const allF = { id: 'x', name: 'f', rows: [{ letter: 'F', minPct: 0, points: 0 }] };
  expect(targetPointsFor('PASS', allF)).toBe(1);
});

it('defaultTargetPct is the A row bound, else 90', () => {
  expect(defaultTargetPct(DEFAULT_SCALE)).toBe(90);
  expect(defaultTargetPct({ id: 'x', name: 'y', rows: [{ letter: 'A', minPct: 85, points: 4 }] })).toBe(85);
  expect(defaultTargetPct({ id: 'x', name: 'y', rows: [{ letter: 'P', minPct: 70, points: 1 }] })).toBe(90);
});
