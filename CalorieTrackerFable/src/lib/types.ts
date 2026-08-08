export type MacroSet = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type ExtendedNutrients = {
  fiber: number;
  sugar: number;
  sodium: number;
};

export type Meal = MacroSet & {
  id: string;
  name: string;
  emoji: string;
  photoUri: string | null;
  note: string | null;
  servingSize: string | null;
  servings: number;
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

/** A normalized food item from USDA or manual entry, ready for review/logging. */
export type FoodItem = MacroSet & {
  name: string;
  brand: string | null;
  emoji: string;
  servingSize: string;
  servings: number;
  source: 'usda' | 'manual';
  /** Extended nutrients stored in the note field for reference. */
  fiber: number;
  sugar: number;
  sodium: number;
};

/** Convert a FoodItem into the AnalysisResult shape that logMeal expects. */
export function foodItemToAnalysis(item: FoodItem): AnalysisResult {
  const scale = item.servings > 0 ? item.servings : 1;
  return {
    name: item.name,
    emoji: item.emoji,
    calories: Math.round(item.calories * scale),
    protein: Math.round(item.protein * scale),
    carbs: Math.round(item.carbs * scale),
    fat: Math.round(item.fat * scale),
    confidence: 'high',
    items: [],
  };
}
