import * as Haptics from 'expo-haptics';
import { View } from 'react-native';
import { SquareIconButton } from '@/ui/primitives';
import { ATTENDANCE_STATUSES, AttendanceStatus } from '../logic';

const GLYPHS: Record<AttendanceStatus, string> = {
  present: '✓',
  absent: '✗',
  late: '~',
  excused: '◌',
};

const TONES: Record<AttendanceStatus, 'ink' | 'danger' | 'ink70'> = {
  present: 'ink',
  absent: 'danger',
  late: 'ink70',
  excused: 'ink70',
};

export function AttendanceButtons({ value, onSelect, size = 24 }:
  { value: AttendanceStatus | null; onSelect: (status: AttendanceStatus) => void | Promise<void>; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {ATTENDANCE_STATUSES.map((status) => (
        <SquareIconButton
          key={status}
          glyph={GLYPHS[status]}
          tone={TONES[status]}
          size={size}
          active={value === status}
          label={status}
          onPress={() => {
            // Feedback only after the write settles: a rejected write stays
            // silent (the caller owns the failure) instead of buzzing "saved".
            void Promise.resolve(onSelect(status))
              .then(() => Haptics.selectionAsync())
              .catch(() => {});
          }}
        />
      ))}
    </View>
  );
}
