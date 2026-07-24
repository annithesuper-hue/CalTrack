import type { Goals, Profile } from './types';

const ACTIVITY_FACTOR: Record<Profile['activity'], number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
};

const GOAL_ADJUSTMENT: Record<Profile['goalType'], number> = {
  lose: -400,
  maintain: 0,
  gain: 350,
};

/** Mifflin-St Jeor BMR → TDEE → goal-adjusted daily targets. */
export function computePlan(profile: Profile): Goals {
  const { sex, age, heightCm, weightKg, activity, goalType } = profile;
  const bmr =
    10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161);
  const tdee = bmr * ACTIVITY_FACTOR[activity];
  const calories = clampRound(tdee + GOAL_ADJUSTMENT[goalType], 1200, 4200, 10);

  // Protein anchored to body weight, fat at 30% of calories, carbs fill the rest.
  const proteinPerKg = goalType === 'lose' ? 1.9 : goalType === 'gain' ? 1.7 : 1.5;
  const protein = clampRound(weightKg * proteinPerKg, 60, 260, 5);
  const fat = clampRound((calories * 0.3) / 9, 35, 150, 5);
  const carbs = clampRound((calories - protein * 4 - fat * 9) / 4, 60, 500, 5);

  return { calories, protein, carbs, fat };
}

function clampRound(value: number, min: number, max: number, step: number): number {
  const clamped = Math.min(max, Math.max(min, value));
  return Math.round(clamped / step) * step;
}

export const DEFAULT_GOALS: Goals = {
  calories: 2200,
  protein: 140,
  carbs: 230,
  fat: 75,
};
