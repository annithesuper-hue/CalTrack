import type { SFSymbol } from 'expo-symbols';

import { useTheme, type ColorPalette } from './theme';
import type { MealType } from './types';

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];

export type MealTypeMetaEntry = { label: string; icon: SFSymbol; emoji: string; color: string };

function buildMealTypeMeta(colors: ColorPalette): Record<MealType, MealTypeMetaEntry> {
  return {
    breakfast: { label: 'Breakfast', icon: 'sunrise.fill', emoji: '🌅', color: colors.yellow },
    lunch: { label: 'Lunch', icon: 'sun.max.fill', emoji: '☀️', color: colors.orange },
    dinner: { label: 'Dinner', icon: 'moon.stars.fill', emoji: '🌙', color: colors.protein },
    snack: { label: 'Snack', icon: 'takeoutbag.and.cup.and.straw.fill', emoji: '🍿', color: colors.carbs },
    other: { label: 'Other', icon: 'fork.knife', emoji: '🍽️', color: colors.inkMuted },
  };
}

/** Theme-aware meal-type metadata (label/icon/emoji/color) — use inside components instead of a static import so colors update with the theme. */
export function useMealTypeMeta(): Record<MealType, MealTypeMetaEntry> {
  const { colors } = useTheme();
  return buildMealTypeMeta(colors);
}

/** Sensible default meal type based on the time of day — used to preselect the picker. */
export function inferMealTypeFromHour(date: Date = new Date()): MealType {
  const h = date.getHours();
  if (h >= 4 && h < 11) return 'breakfast';
  if (h >= 11 && h < 16) return 'lunch';
  if (h >= 16 && h < 22) return 'dinner';
  return 'snack';
}
