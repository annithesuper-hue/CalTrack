import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import type { LiveActivity } from 'expo-widgets';
import { Platform } from 'react-native';

import TodayWidget from '@/widgets/today';
import TodayActivity, { type TodayActivityProps } from '@/widgets/today-activity';

import { getEntriesForDate } from './db';
import { todayKey } from './dates';
import { FoodEntry, Goals, Macros } from './types';

/**
 * Bridge to native platform features (home screen widget, Live Activity,
 * Apple Health, notifications). All functions are safe to call on any
 * platform and never throw — every native call is iOS-guarded and wrapped
 * in try/catch (native modules are missing in Expo Go and on web).
 */

const LIVE_ACTIVITY_DAY_KEY = '@caltrack/liveActivityDay';
const REMINDER_ID_KEY = '@caltrack/reminderNotificationId';
const DEEP_LINK_URL = 'calorietracker://';

type HealthKitModule = typeof import('@kingstinct/react-native-healthkit');

let healthKitModule: HealthKitModule | null | undefined;

/** Lazily loads HealthKit; returns null when unavailable (Expo Go, non-iOS). */
function getHealthKit(): HealthKitModule | null {
  if (healthKitModule !== undefined) return healthKitModule;
  let mod: HealthKitModule | null = null;
  try {
    if (Platform.OS === 'ios') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      mod = require('@kingstinct/react-native-healthkit');
    }
  } catch {
    mod = null;
  }
  healthKitModule = mod;
  return mod;
}

const HEALTH_SHARE_TYPES = [
  'HKQuantityTypeIdentifierDietaryEnergyConsumed',
  'HKQuantityTypeIdentifierDietaryProtein',
  'HKQuantityTypeIdentifierDietaryCarbohydrates',
  'HKQuantityTypeIdentifierDietaryFatTotal',
] as const;

// Foreground presentation for scheduled notifications.
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

let activityInstance: LiveActivity<TodayActivityProps> | null = null;

function getLiveActivityInstance(): LiveActivity<TodayActivityProps> | null {
  if (activityInstance) return activityInstance;
  // Recover an activity that is still running from a previous app session.
  const instances = TodayActivity.getInstances();
  activityInstance = instances.length > 0 ? instances[0] : null;
  return activityInstance;
}

async function endLiveActivity(): Promise<void> {
  if (activityInstance) {
    await activityInstance.end('immediate');
    activityInstance = null;
  }
  await AsyncStorage.removeItem(LIVE_ACTIVITY_DAY_KEY);
}

/** Push today's totals to the home screen widget snapshot and the Live Activity. */
export async function syncTodayProgress(totals: Macros, goals: Goals): Promise<void> {
  if (Platform.OS !== 'ios') return;

  try {
    TodayWidget.updateSnapshot({
      calories: totals.calories,
      calorieGoal: goals.calories,
      protein: totals.protein,
      proteinGoal: goals.protein,
      carbs: totals.carbs,
      carbsGoal: goals.carbs,
      fat: totals.fat,
      fatGoal: goals.fat,
    });
  } catch {
    // Widget extension unavailable — ignore.
  }

  try {
    let lastMealName = '';
    try {
      const entries = await getEntriesForDate(todayKey());
      lastMealName = entries.length > 0 ? entries[entries.length - 1].name : '';
    } catch {
      // Database unavailable — continue with an empty label.
    }

    const props: TodayActivityProps = {
      calories: totals.calories,
      calorieGoal: goals.calories,
      protein: totals.protein,
      carbs: totals.carbs,
      fat: totals.fat,
      lastMealName,
    };

    if (totals.calories <= 0) {
      // Nothing logged today — no Live Activity.
      if (getLiveActivityInstance()) await endLiveActivity();
      return;
    }

    const today = todayKey();
    const storedDay = await AsyncStorage.getItem(LIVE_ACTIVITY_DAY_KEY);
    let instance = getLiveActivityInstance();

    if (instance && storedDay !== today) {
      // Stale activity from a previous day — end it and start fresh.
      await instance.end('immediate');
      activityInstance = null;
      instance = null;
    }

    if (instance) {
      await instance.update(props);
    } else {
      activityInstance = TodayActivity.start(props, DEEP_LINK_URL);
    }
    await AsyncStorage.setItem(LIVE_ACTIVITY_DAY_KEY, today);
  } catch (e) {
    console.error('[native-sync] Live Activity error:', e);
  }
}

/**
 * Write a food entry to Apple Health (dietary energy + protein/carbs/fat).
 * Returns true when the samples were saved. No-op when health sync is off.
 */
export async function syncEntryToHealth(entry: FoodEntry): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    const hk = getHealthKit();
    if (!hk) return false;
    const date = new Date(entry.createdAt);
    await Promise.all([
      hk.saveQuantitySample(
        'HKQuantityTypeIdentifierDietaryEnergyConsumed',
        'kcal',
        entry.calories,
        date,
        date
      ),
      hk.saveQuantitySample(
        'HKQuantityTypeIdentifierDietaryProtein',
        'g',
        entry.protein,
        date,
        date
      ),
      hk.saveQuantitySample(
        'HKQuantityTypeIdentifierDietaryCarbohydrates',
        'g',
        entry.carbs,
        date,
        date
      ),
      hk.saveQuantitySample(
        'HKQuantityTypeIdentifierDietaryFatTotal',
        'g',
        entry.fat,
        date,
        date
      ),
    ]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Enable/disable Apple Health sync. When enabling, requests HealthKit
 * authorization and returns whether it was granted.
 */
export async function setHealthSyncEnabled(enabled: boolean): Promise<boolean> {
  if (!enabled) return true;
  if (Platform.OS !== 'ios') return false;
  try {
    const hk = getHealthKit();
    if (!hk) return false;
    return await hk.requestAuthorization({ toShare: [...HEALTH_SHARE_TYPES] });
  } catch {
    return false;
  }
}

async function cancelReminder(): Promise<void> {
  const id = await AsyncStorage.getItem(REMINDER_ID_KEY);
  if (id) {
    await Notifications.cancelScheduledNotificationAsync(id);
    await AsyncStorage.removeItem(REMINDER_ID_KEY);
  }
}

/** Schedule/cancel the daily "log your dinner" reminder notification. */
export async function setDailyReminderEnabled(enabled: boolean): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await cancelReminder();
    if (!enabled) return;
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Log your dinner 🍽',
        body: 'One photo is all it takes — keep your streak going.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 19,
        minute: 30,
      },
    });
    await AsyncStorage.setItem(REMINDER_ID_KEY, id);
  } catch {
    // Notifications unavailable — ignore.
  }
}
