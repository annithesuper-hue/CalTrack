/** Core domain types shared across the app, API routes and native integrations. */

export interface Macros {
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
}

export type EntrySource = 'camera' | 'manual';

export interface FoodEntry extends Macros {
  id: string;
  /** Local day key, YYYY-MM-DD */
  date: string;
  /** Epoch ms when the entry was logged */
  createdAt: number;
  name: string;
  imageUri: string | null;
  source: EntrySource;
  syncedToHealth: boolean;
}

export type NewFoodEntry = Omit<FoodEntry, 'id' | 'createdAt' | 'syncedToHealth'>;

export interface Goals extends Macros {}

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type WeightGoal = 'lose' | 'maintain' | 'gain';

export interface Profile {
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  goal: WeightGoal;
}

/** Per-item breakdown returned by the food analysis API. */
export interface EstimateItem extends Macros {
  name: string;
}

/** Result of POST /api/analyze-food. */
export interface FoodEstimate extends Macros {
  /** Short meal title, e.g. "Grilled salmon with rice" */
  name: string;
  items: EstimateItem[];
}

/** Aggregated totals for one calendar day (used by history/charts/widget). */
export interface DaySummary extends Macros {
  date: string; // YYYY-MM-DD
  entryCount: number;
}

export const ZERO_MACROS: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 };

export function sumMacros(entries: Macros[]): Macros {
  return entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
    }),
    { ...ZERO_MACROS }
  );
}
