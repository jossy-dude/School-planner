import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { migrateNow } from '@/db';
import { refreshReminders } from '@/features/reminders/refresh';
import { runAutoBackup } from '@/features/backup/auto';
import { autoSeedIfEmpty } from '@/features/dev/seed';
import { useFontsLoaded } from '@/ui/fonts';
import { BootErrorScreen } from '@/ui/BootErrorScreen';
import { PaperTexture } from '@/ui/PaperTexture';
import { colors } from '@/ui/tokens';

// Module-level one-shots: survive StrictMode's double-mounted effect in dev,
// so a session can never double-backup or re-seed over the user's data.
let autoBackupChecked = false;
let autoSeedChecked = false;

export default function RootLayout() {
  const fontsLoaded = useFontsLoaded();
  const [ready, setReady] = useState(false);
  const [migrateFailed, setMigrateFailed] = useState(false);
  useEffect(() => {
    migrateNow()
      .then(() => {
        setReady(true);
        // Setup + catch-up both run inside the serialized refresh chain.
        refreshReminders().catch(() => {});
        // Auto-backup is fire-and-forget: it never gates first paint.
        if (!autoBackupChecked) {
          autoBackupChecked = true;
          runAutoBackup().catch(() => {});
        }
        // Dev only: a brand-new install opens full of demo data instead of
        // empty states. Stops the moment any course exists.
        if (!autoSeedChecked) {
          autoSeedChecked = true;
          autoSeedIfEmpty().catch(() => {});
        }
      })
      .catch(() => setMigrateFailed(true));
  }, []);
  if (migrateFailed) {
    return <BootErrorScreen />;
  }
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
        <Stack.Screen name="grade/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="note-edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="file-add" options={{ presentation: 'modal' }} />
        <Stack.Screen name="exception-edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="course/[id]" />
        <Stack.Screen name="day/[date]" />
        <Stack.Screen name="settings" />
      </Stack>
      <PaperTexture />
    </GestureHandlerRootView>
  );
}
