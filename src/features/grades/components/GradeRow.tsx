import { Text, View } from 'react-native';
import { Grade, GradeCategory } from '@/db/schema';
import { BrutCard } from '@/ui/BrutCard';
import { colors, fontFamilies, radius } from '@/ui/tokens';

export function GradeListItem({ grade, category, onPress, onDelete }: {
  grade: Grade;
  category?: GradeCategory;
  onPress: () => void;
  onDelete: () => void;
}) {
  return (
    <BrutCard onPress={onPress} onLongPress={onDelete}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text numberOfLines={1} style={{ fontFamily: fontFamilies.body, fontSize: 15, color: colors.ink }}>
            {grade.title}
          </Text>
          <Text style={{ fontFamily: fontFamilies.mono, fontSize: 11, color: colors.ink40 }}>
            {grade.date}
            {category ? ` · #${category.name}` : ''}
          </Text>
        </View>
        {grade.weightOverride !== null && (
          <View style={{
            borderWidth: 1.5, borderColor: colors.ink, borderRadius: radius.pill,
            paddingHorizontal: 6, paddingVertical: 1,
          }}>
            <Text style={{ fontFamily: fontFamilies.lcd, fontSize: 12, color: colors.ink }}>
              ×{grade.weightOverride}
            </Text>
          </View>
        )}
        <Text style={{ fontFamily: fontFamilies.lcd, fontSize: 18, color: colors.ink }}>
          {grade.score}/{grade.maxScore}
        </Text>
      </View>
    </BrutCard>
  );
}
