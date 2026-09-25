import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { PlannedReminder } from '@/lib/reminders';

export async function ensureNotificationSetup(): Promise<boolean> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders', importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250], lightColor: '#FF231F7C', sound: null,
    });
  }
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

export async function rescheduleAll(plan: PlannedReminder[]): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const r of plan.slice(0, 64)) {
    await Notifications.scheduleNotificationAsync({
      content: { title: r.title, body: r.body, data: { key: r.key } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(r.fireAtMs), channelId: 'reminders' },
    });
  }
}

export async function catchUpMissed(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const now = Date.now();
  for (const s of scheduled) {
    const trigger = s.trigger as { type?: string; value?: number; date?: number; seconds?: number } | null;
    const fireAtMs =
      trigger?.type === 'date' ? (typeof trigger.value === 'number' ? trigger.value : trigger.date) : undefined;
    if (typeof fireAtMs === 'number' && fireAtMs < now) {
      await Notifications.scheduleNotificationAsync({
        content: { title: s.content.title ?? '', body: s.content.body ?? '', data: (s.content.data as Record<string, unknown>) ?? {} },
        trigger: null,
      });
      await Notifications.cancelScheduledNotificationAsync(s.identifier);
    }
    // iOS: DATE triggers read back as timeInterval, so the original fire date is unrecoverable — no-op by design.
  }
}
