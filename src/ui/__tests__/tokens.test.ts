import { colors, fontFamilies } from '../tokens';

it('uses paper monochrome palette', () => {
  expect(colors.paper).toBe('#F4F1EA');
  expect(Object.keys(fontFamilies)).toEqual(
    expect.arrayContaining(['body', 'mono', 'clock', 'lcd', 'stamp']),
  );
});
