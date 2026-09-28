import { paperTheme } from '../theme';
const theme = paperTheme('2026-09-28');
const base = theme.itemDay!.base!({} as never);
const active = theme.itemDay!.active!({ isStartOfRange: true, isEndOfRange: true } as never);

it('active cell is fully rounded single-day selection in ink', () => {
  expect(active.container!.backgroundColor).toBe('#141414');
  expect(active.container!.borderTopLeftRadius).toBe(16);
  expect(active.content!.color).toBe('#F4F1EA');
});
it('inactive base uses paper and rounded corners', () => {
  expect((base.container as never as { borderTopLeftRadius: number }).borderTopLeftRadius).toBe(16);
});
