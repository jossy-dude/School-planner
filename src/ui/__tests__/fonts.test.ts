import { FONTS } from '../fonts';
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
