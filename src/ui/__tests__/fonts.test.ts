import { FONTS, fontsReady } from '../fonts';
import { fontFamilies } from '../tokens';

it('registers every required family source', () => {
  expect(Object.keys(FONTS)).toEqual(
    expect.arrayContaining(['DotGothic16', 'DSEG7Classic', 'DSEG14Classic']),
  );
  expect(Object.keys(FONTS).length).toBeGreaterThanOrEqual(10);
});

it('registers every fontFamilies alias from tokens', () => {
  expect(Object.keys(FONTS)).toEqual(
    expect.arrayContaining(Object.values(fontFamilies)),
  );
});

it('keeps booting on a font load error instead of blocking on the spinner', () => {
  expect(fontsReady(false, null)).toBe(false);
  expect(fontsReady(true, null)).toBe(true);
  // Error path: proceed with system fonts rather than hanging forever.
  expect(fontsReady(false, new Error('font failed'))).toBe(true);
  expect(fontsReady(true, new Error('font failed'))).toBe(true);
});
