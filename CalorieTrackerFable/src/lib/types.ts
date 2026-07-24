export type MacroSet = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type Meal = MacroSet & {
  id: string;
  name: string;
  emoji: string;
  photoUri: string | null;
  note: string | null;
  createdAt: number; // unix ms
};

export type Goals = MacroSet;

export type GoalType = 'lose' | 'maintain' | 'gain';
export type Sex = 'female' | 'male';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very';

export type Profile = {
  goalType: GoalType;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
};

export type DaySummary = MacroSet & {
  /** YYYY-MM-DD local */
  day: string;
  mealCount: number;
};

export type AnalysisItem = {
  name: string;
  calories: number;
};

export type AnalysisResult = MacroSet & {
  name: string;
  emoji: string;
  confidence: 'low' | 'medium' | 'high';
  items: AnalysisItem[];
};
