import { Text, View } from 'react-native';
import { TickBar } from '@/ui/tickbar';
import { colors, fontFamilies } from '@/ui/tokens';
import { weekProgress } from '../logic';

export function WeekGauge({ sessions, attended }: { sessions: number; attended: number }) {
  const progress = Math.min(1, Math.max(0, weekProgress(sessions, attended)));
  return (
    <View style={{ alignItems: 'center', gap: 8, paddingVertical: 8 }}>
      <TickBar progress={progress} />
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <Text style={{ fontFamily: fontFamilies.lcd, fontSize: 22, color: colors.ink }}>
          {attended}/{sessions}
        </Text>
        <Text style={{ fontFamily: fontFamilies.mono, fontSize: 11, color: colors.ink40, letterSpacing: 1 }}>
          THIS WEEK
        </Text>
      </View>
    </View>
  );
}
