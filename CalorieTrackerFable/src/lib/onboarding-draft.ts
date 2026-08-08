import type { ActivityLevel, GoalType, Profile, Sex } from './types';

/** In-memory answers collected during onboarding, before the account exists. */
export const draft: {
  goalType: GoalType;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
} = {
  goalType: 'lose',
  sex: 'female',
  age: 28,
  heightCm: 170,
  weightKg: 72,
  activity: 'light',
};

export function draftProfile(): Profile {
  return { ...draft };
}
