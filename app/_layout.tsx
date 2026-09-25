import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colors } from '@/ui/tokens';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.paper },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="schedule-edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="event/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="note-edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="course/[id]" />
        <Stack.Screen name="settings" />
      </Stack>
    </GestureHandlerRootView>
  );
}
