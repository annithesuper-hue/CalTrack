export type Goals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type MealEstimate = {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
  items: string[];
};

export type MealRecord = MealEstimate & {
  id: number;
  eatenAt: string;
  day: string;
  imageUri: string | null;
};

export type DailySummary = Goals & {
  day: string;
};

export type AppState = {
  ready: boolean;
  onboardingComplete: boolean;
  goals: Goals;
  todayMeals: MealRecord[];
  history: DailySummary[];
};

export const EMPTY_TOTALS: Goals = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
};

export const DEFAULT_GOALS: Goals = {
  calories: 2100,
  protein: 150,
  carbs: 220,
  fat: 70,
};

