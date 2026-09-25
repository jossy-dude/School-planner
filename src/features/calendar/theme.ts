import type { CalendarTheme } from '@marceloterreiro/flash-calendar';
import { colors, fontFamilies } from '@/ui/tokens';

export function paperTheme(selectedId: string | null): CalendarTheme {
  void selectedId;
  return {
    itemDay: {
      base: () => ({
        container: {
          backgroundColor: colors.paper,
          borderTopLeftRadius: 16,
          borderBottomLeftRadius: 16,
          borderTopRightRadius: 16,
          borderBottomRightRadius: 16,
        },
      }),
      idle: () => ({ content: { color: colors.ink } }),
      today: () => ({
        container: { borderWidth: 1.5, borderColor: colors.ink },
        content: { color: colors.ink },
      }),
      active: () => ({
        container: {
          backgroundColor: colors.ink,
          borderTopLeftRadius: 16,
          borderBottomLeftRadius: 16,
          borderTopRightRadius: 16,
          borderBottomRightRadius: 16,
        },
        content: { color: colors.paper },
      }),
      disabled: () => ({ content: { color: colors.ink15 } }),
    },
    rowWeek: { container: { backgroundColor: colors.paper } },
    itemWeekName: {
      content: { color: colors.ink40, fontFamily: fontFamilies.mono, fontSize: 11 },
    },
    rowMonth: { container: { backgroundColor: colors.paper }, content: { color: colors.ink } },
  };
}
