import { Text, View } from 'react-native';
import { Pattern } from '@/db/schema';
import { BrutCard } from '@/ui/BrutCard';
import { SquareIconButton } from '@/ui/primitives';
import { colors, fontFamilies, radius } from '@/ui/tokens';

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function PatternRow({ pattern, onPress, onDelete }: {
  pattern: Pattern;
  onPress: () => void;
  onDelete: () => void;
}) {
  const letter = WEEKDAY_LETTERS[pattern.weekday] ?? '?';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <BrutCard onPress={onPress} style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{
            width: 34, height: 34, backgroundColor: colors.ink, borderRadius: radius.sm,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontFamily: fontFamilies.heading, fontSize: 15, color: colors.paper }}>{letter}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: fontFamilies.lcd, fontSize: 17, color: colors.ink }}>
              {pattern.startTime}–{pattern.endTime}
            </Text>
            {pattern.location ? (
              <Text style={{ fontFamily: fontFamilies.mono, fontSize: 12, color: colors.ink70 }}>
                {pattern.location}
              </Text>
            ) : null}
          </View>
          <Text
            style={{ fontSize: 15, color: colors.ink40 }}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            ✎
          </Text>
        </View>
      </BrutCard>
      <SquareIconButton glyph="✕" tone="danger" size={40} onPress={onDelete} />
    </View>
  );
}
