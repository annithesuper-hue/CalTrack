import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function enableMealReminders() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('meal-reminders', {
      name: 'Meal reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180],
      lightColor: '#A7E86B',
    });
  }

  const current = await Notifications.getPermissionsAsync();
  const permission =
    current.status === 'granted' ? current : await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') return { enabled: false, pushToken: null };

  await Notifications.cancelAllScheduledNotificationsAsync();
  const reminders = [
    { hour: 9, title: 'Breakfast check-in', body: 'Snap your breakfast before the day gets busy.' },
    { hour: 14, title: 'Lunch, logged in seconds', body: 'A quick photo keeps your day on track.' },
    { hour: 20, title: 'Finish today strong', body: 'Log dinner and see how your macros landed.' },
  ];
  for (const reminder of reminders) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: reminder.body,
        sound: 'default',
        data: { route: '/(tabs)' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: reminder.hour,
        minute: 0,
        channelId: 'meal-reminders',
      },
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
  const token = projectId
    ? (await Notifications.getExpoPushTokenAsync({ projectId })).data
    : null;
  return { enabled: true, pushToken: token };
}

