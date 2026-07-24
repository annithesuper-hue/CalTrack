import {
  isHealthDataAvailable,
  requestAuthorization,
  saveQuantitySample,
} from '@kingstinct/react-native-healthkit';

import type { MealEstimate } from '@/lib/types';

const nutritionTypes = [
  'HKQuantityTypeIdentifierDietaryEnergyConsumed',
  'HKQuantityTypeIdentifierDietaryProtein',
  'HKQuantityTypeIdentifierDietaryCarbohydrates',
  'HKQuantityTypeIdentifierDietaryFatTotal',
] as const;

let authorized = false;

export async function enableHealthIntegration() {
  if (!(await isHealthDataAvailable())) return false;
  authorized = await requestAuthorization({
    toRead: ['HKQuantityTypeIdentifierActiveEnergyBurned'],
    toShare: [...nutritionTypes],
  });
  return authorized;
}

export async function syncNutritionToHealth(meal: MealEstimate) {
  if (!authorized && !(await enableHealthIntegration())) return;
  const now = new Date();
  await Promise.all([
    saveQuantitySample(
      'HKQuantityTypeIdentifierDietaryEnergyConsumed',
      'kcal',
      meal.calories,
      now,
      now
    ),
    saveQuantitySample(
      'HKQuantityTypeIdentifierDietaryProtein',
      'g',
      meal.protein,
      now,
      now
    ),
    saveQuantitySample(
      'HKQuantityTypeIdentifierDietaryCarbohydrates',
      'g',
      meal.carbs,
      now,
      now
    ),
    saveQuantitySample(
      'HKQuantityTypeIdentifierDietaryFatTotal',
      'g',
      meal.fat,
      now,
      now
    ),
  ]);
}
