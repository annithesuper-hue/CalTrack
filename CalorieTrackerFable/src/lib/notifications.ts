import * as Notifications from 'expo-notifications';

import { kvGet, kvSet } from './db';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export function areRemindersEnabled(): boolean {
  return kvGet('reminders') === '1';
}

const REMINDERS = [
  { hour: 8, minute: 30, title: 'Good morning ☀️', body: 'Snap your breakfast to start the day on track.' },
  { hour: 13, minute: 0, title: 'Lunch time 🍽️', body: "Don't forget to log your lunch — it takes one photo." },
  { hour: 19, minute: 30, title: 'Dinner check-in 🌙', body: 'Log dinner to close out your day strong.' },
];

/** Asks for permission and schedules daily meal reminders. Returns success. */
export async function enableReminders(): Promise<boolean> {
  const settings = await Notifications.requestPermissionsAsync();
  if (!settings.granted && settings.ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL) {
    kvSet('reminders', '0');
    return false;
  }
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const r of REMINDERS) {
    await Notifications.scheduleNotificationAsync({
      content: { title: r.title, body: r.body, sound: false },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: r.hour,
        minute: r.minute,
      },
    });
  }
  kvSet('reminders', '1');
  return true;
}

export async function disableReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  kvSet('reminders', '0');
}
