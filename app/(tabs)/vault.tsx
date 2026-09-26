import { Text, View } from 'react-native';
import { EmptyState } from '@/ui/primitives';
import { colors, fontFamilies } from '@/ui/tokens';

export default function VaultScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, padding: 16 }}>
      <Text style={{ fontFamily: fontFamilies.heading, fontSize: 18, color: colors.ink, marginBottom: 12 }}>
        VAULT
      </Text>
      <EmptyState glyph="▤" label="coming soon" />
    </View>
  );
}
