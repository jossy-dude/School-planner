import { cancelAllScheduledNotificationsAsync } from 'expo-notifications/build/cancelAllScheduledNotificationsAsync';
import { cancelScheduledNotificationAsync } from 'expo-notifications/build/cancelScheduledNotificationAsync';
import { getAllScheduledNotificationsAsync } from 'expo-notifications/build/getAllScheduledNotificationsAsync';
import { AndroidImportance } from 'expo-notifications/build/NotificationChannelManager.types';
import { getPermissionsAsync, requestPermissionsAsync } from 'expo-notifications/build/NotificationPermissions';
import { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';
import { scheduleNotificationAsync } from 'expo-notifications/build/scheduleNotificationAsync';
import { setNotificationChannelAsync } from 'expo-notifications/build/setNotificationChannelAsync';
import { SchedulableTriggerInputTypes } from 'expo-notifications/build/Notifications.types';
import { Platform } from 'react-native';
import { PlannedReminder } from '@/lib/reminders';

export async function ensureNotificationSetup(): Promise<boolean> {
  setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await setNotificationChannelAsync('reminders', {
      name: 'Reminders', importance: AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250], lightColor: '#FF231F7C', sound: null,
    });
  }
  const existing = await getPermissionsAsync();
  if (existing.granted) return true;
  const req = await requestPermissionsAsync();
  return req.granted;
}

export async function notificationsGranted(): Promise<boolean> {
  try {
    const existing = await getPermissionsAsync();
    return existing.granted;
  } catch {
    return true;
  }
}

export async function rescheduleAll(plan: PlannedReminder[]): Promise<void> {
  await cancelAllScheduledNotificationsAsync();
  for (const r of plan.slice(0, 64)) {
    await scheduleNotificationAsync({
      content: { title: r.title, body: r.body, data: { key: r.key } },
      trigger: { type: SchedulableTriggerInputTypes.DATE, date: new Date(r.fireAtMs), channelId: 'reminders' },
    });
  }
}

export async function catchUpMissed(): Promise<void> {
  const scheduled = await getAllScheduledNotificationsAsync();
  const now = Date.now();
  for (const s of scheduled) {
    const trigger = s.trigger as { type?: string; value?: number; date?: number; seconds?: number } | null;
    const fireAtMs =
      trigger?.type === 'date' ? (typeof trigger.value === 'number' ? trigger.value : trigger.date) : undefined;
    if (typeof fireAtMs === 'number' && fireAtMs < now) {
      await scheduleNotificationAsync({
        content: { title: s.content.title ?? '', body: s.content.body ?? '', data: (s.content.data as Record<string, unknown>) ?? {} },
        trigger: null,
      });
      await cancelScheduledNotificationAsync(s.identifier);
    }
    // iOS: DATE triggers read back as timeInterval, so the original fire date is unrecoverable — no-op by design.
  }
}
