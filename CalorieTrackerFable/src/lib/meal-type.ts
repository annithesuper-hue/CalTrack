import type { SFSymbol } from 'expo-symbols';

import { Colors } from './theme';
import type { MealType } from './types';

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];

export const MealTypeMeta: Record<MealType, { label: string; icon: SFSymbol; emoji: string; color: string }> = {
  breakfast: { label: 'Breakfast', icon: 'sunrise.fill', emoji: '🌅', color: Colors.yellow },
  lunch: { label: 'Lunch', icon: 'sun.max.fill', emoji: '☀️', color: Colors.orange },
  dinner: { label: 'Dinner', icon: 'moon.stars.fill', emoji: '🌙', color: Colors.protein },
  snack: { label: 'Snack', icon: 'takeoutbag.and.cup.and.straw.fill', emoji: '🍿', color: Colors.carbs },
  other: { label: 'Other', icon: 'fork.knife', emoji: '🍽️', color: Colors.inkMuted },
};

/** Sensible default meal type based on the time of day — used to preselect the picker. */
export function inferMealTypeFromHour(date: Date = new Date()): MealType {
  const h = date.getHours();
  if (h >= 4 && h < 11) return 'breakfast';
  if (h >= 11 && h < 16) return 'lunch';
  if (h >= 16 && h < 22) return 'dinner';
  return 'snack';
}
