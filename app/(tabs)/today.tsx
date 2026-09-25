import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { SquareIconButton } from '@/ui/primitives';
import { colors, fontFamilies } from '@/ui/tokens';

export default function TodayScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, padding: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <SquareIconButton glyph="⚙" onPress={() => router.push('/settings')} />
      </View>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontFamily: fontFamilies.heading, fontSize: 18, color: colors.ink }}>TODAY</Text>
      </View>
    </View>
  );
}
