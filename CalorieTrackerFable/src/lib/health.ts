import { Platform } from 'react-native';

import { kvGet, kvSet } from './db';
import type { Meal } from './types';

const SHARE_TYPES = [
  'HKQuantityTypeIdentifierDietaryEnergyConsumed',
  'HKQuantityTypeIdentifierDietaryProtein',
  'HKQuantityTypeIdentifierDietaryCarbohydrates',
  'HKQuantityTypeIdentifierDietaryFatTotal',
] as const;

export function isHealthSyncEnabled(): boolean {
  return kvGet('healthSync') === '1';
}

export function setHealthSyncEnabled(enabled: boolean): void {
  kvSet('healthSync', enabled ? '1' : '0');
}

/** Requests HealthKit write access for nutrition types. Returns success. */
export async function requestHealthAccess(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    const { requestAuthorization } = await import('@kingstinct/react-native-healthkit');
    return await requestAuthorization({ toShare: SHARE_TYPES });
  } catch (e) {
    console.warn('HealthKit authorization failed', e);
    return false;
  }
}

/** Writes a logged meal to Apple Health as dietary samples. Best-effort. */
export async function saveMealToHealth(meal: Meal): Promise<void> {
  if (Platform.OS !== 'ios' || !isHealthSyncEnabled()) return;
  try {
    const { saveQuantitySample } = await import('@kingstinct/react-native-healthkit');
    const at = new Date(meal.createdAt);
    await Promise.all([
      saveQuantitySample('HKQuantityTypeIdentifierDietaryEnergyConsumed', 'kcal', meal.calories, at, at),
      saveQuantitySample('HKQuantityTypeIdentifierDietaryProtein', 'g', meal.protein, at, at),
      saveQuantitySample('HKQuantityTypeIdentifierDietaryCarbohydrates', 'g', meal.carbs, at, at),
      saveQuantitySample('HKQuantityTypeIdentifierDietaryFatTotal', 'g', meal.fat, at, at),
    ]);
  } catch (e) {
    console.warn('HealthKit save failed', e);
  }
}
