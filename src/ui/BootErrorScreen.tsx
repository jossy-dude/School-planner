import { Text, View } from 'react-native';
import { colors, fontFamilies } from './tokens';

// Migration failed: never hang on the splash spinner, and never surface a stack
// trace to the user — say what happened and stop.
export function BootErrorScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.paper, padding: 24 }}>
      <Text
        accessibilityRole="alert"
        style={{ fontFamily: fontFamilies.mono, fontSize: 13, color: colors.ink, letterSpacing: 1 }}
      >
        database failed to migrate — restart the app
      </Text>
    </View>
  );
}
