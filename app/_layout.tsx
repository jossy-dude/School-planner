import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { migrateNow } from '@/db';
import { refreshReminders } from '@/features/reminders/refresh';
import { useFontsLoaded } from '@/ui/fonts';
import { GrainOverlay } from '@/ui/GrainOverlay';
import { colors } from '@/ui/tokens';

export default function RootLayout() {
  const fontsLoaded = useFontsLoaded();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    migrateNow().then(() => {
      setReady(true);
      // Setup + catch-up both run inside the serialized refresh chain.
      refreshReminders().catch(() => {});
    });
  }, []);
  if (!fontsLoaded || !ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.paper }}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }
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
      <GrainOverlay />
    </GestureHandlerRootView>
  );
}
