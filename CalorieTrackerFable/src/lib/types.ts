export type MacroSet = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';

export type Meal = MacroSet & {
  id: string;
  name: string;
  emoji: string;
  mealType: MealType;
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
  /** AI's best-guess total weight of the portion in grams — lets the person correct against a known actual weight. */
  estimatedGrams?: number | null;
  /** Present only when the AI flagged the food as discrete/unit-based but genuinely uncertain of the exact count (e.g. a stack of rotis). */
  countable?: { estimatedCount: number; unitLabel: string } | null;
};
