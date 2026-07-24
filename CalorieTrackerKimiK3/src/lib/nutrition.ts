import { ActivityLevel, Goals, Profile, WeightGoal } from './types';

/** Mifflin-St Jeor BMR + activity multiplier, then a goal adjustment. */

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_ADJUST: Record<WeightGoal, number> = {
  lose: -500,
  maintain: 0,
  gain: 300,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary',
  light: 'Lightly active',
  moderate: 'Moderately active',
  active: 'Very active',
  very_active: 'Athlete',
};

export const GOAL_LABELS: Record<WeightGoal, string> = {
  lose: 'Lose weight',
  maintain: 'Maintain',
  gain: 'Gain muscle',
};

export function caloriesFromProfile(p: Profile): number {
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'male' ? 5 : -161);
  const tdee = bmr * ACTIVITY_FACTOR[p.activity];
  return Math.max(1200, Math.round((tdee + GOAL_ADJUST[p.goal]) / 10) * 10);
}

/** Macro split: protein 2g/kg (capped), fat 25% of calories, carbs the rest. */
export function goalsFromProfile(p: Profile): Goals {
  const calories = caloriesFromProfile(p);
  const protein = Math.min(Math.round(p.weightKg * 2), 220);
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { calories, protein, carbs, fat };
}
