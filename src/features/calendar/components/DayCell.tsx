import { Calendar } from '@marceloterreiro/flash-calendar';
import type { CalendarDayMetadata, CalendarTheme } from '@marceloterreiro/flash-calendar';
import { View } from 'react-native';
import Animated, { measure, runOnJS, useAnimatedRef } from 'react-native-reanimated';
import type { AnimatedRef } from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';
import type { DayDotSpec } from '@/features/calendar/dots';

export interface CellFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const DAY_CELL_HEIGHT = 38;
const DOT_ROW_HEIGHT = 6;

interface DayCellProps {
  day: CalendarDayMetadata;
  theme: CalendarTheme['itemDay'];
  dots: readonly DayDotSpec[];
  onDayPress: (id: string, frame: CellFrame | null) => void;
  rootRef: AnimatedRef<Animated.View>;
}

export function DayCell({ day, theme, dots, onDayPress, rootRef }: DayCellProps) {
  const cellRef = useAnimatedRef<Animated.View>();
  const openOnJs = runOnJS(onDayPress);
  const handlePress = (id: string) => {
    scheduleOnUI(() => {
      'worklet';
      const cell = measure(cellRef);
      const root = measure(rootRef);
      const frame = cell && root
        ? { x: cell.pageX - root.pageX, y: cell.pageY - root.pageY, width: cell.width, height: cell.height }
        : null;
      openOnJs(id, frame);
    });
  };
  return (
    <Animated.View ref={cellRef} style={{ flex: 1, height: DAY_CELL_HEIGHT }}>
      <Calendar.Item.Day
        metadata={day}
        height={DAY_CELL_HEIGHT - DOT_ROW_HEIGHT}
        onPress={handlePress}
        theme={theme}
      >
        {day.displayLabel}
      </Calendar.Item.Day>
      <View style={{
        height: DOT_ROW_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}>
        {dots.map((d, i) => (
          <View
            key={`${d.shape}-${d.color}-${i}`}
            style={{
              width: 3,
              height: 3,
              borderRadius: d.shape === 'diamond' ? 0 : 1.5,
              backgroundColor: d.color,
              transform: d.shape === 'diamond' ? [{ rotate: '45deg' }] : undefined,
            }}
          />
        ))}
      </View>
    </Animated.View>
  );
}
