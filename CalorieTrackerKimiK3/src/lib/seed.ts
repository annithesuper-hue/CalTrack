import { addEntry, isEmpty } from './db';
import { dateKey } from './dates';

/**
 * Seeds ~3 weeks of plausible meal logs so history charts look real on first launch.
 * Only runs when the database is empty.
 */

type Meal = [name: string, calories: number, protein: number, carbs: number, fat: number];

const BREAKFASTS: Meal[] = [
  ['Greek yogurt with granola and berries', 380, 24, 48, 10],
  ['Scrambled eggs on sourdough toast', 420, 22, 38, 19],
  ['Oatmeal with banana and peanut butter', 450, 14, 62, 16],
  ['Avocado toast with poached eggs', 410, 17, 34, 23],
  ['Protein smoothie with oats', 360, 30, 40, 8],
  ['Pancakes with maple syrup', 520, 12, 78, 17],
];

const LUNCHES: Meal[] = [
  ['Grilled chicken Caesar salad', 480, 42, 18, 26],
  ['Turkey and cheese sandwich', 540, 32, 52, 20],
  ['Salmon poke bowl', 560, 38, 58, 18],
  ['Chicken burrito bowl', 640, 40, 66, 22],
  ['Quinoa Buddha bowl', 470, 18, 62, 17],
  ['Margherita pizza, 2 slices', 570, 24, 66, 22],
  ['Beef taco bowl with rice', 610, 36, 54, 25],
];

const DINNERS: Meal[] = [
  ['Grilled salmon with roasted potatoes', 620, 42, 45, 28],
  ['Chicken stir-fry with jasmine rice', 580, 38, 62, 17],
  ['Spaghetti bolognese', 640, 34, 74, 22],
  ['Steak with sweet potato fries', 720, 48, 48, 34],
  ['Chicken curry with basmati rice', 660, 40, 68, 24],
  ['Baked cod with quinoa and greens', 480, 38, 46, 14],
  ['Veggie pasta with parmesan', 560, 20, 82, 16],
];

const SNACKS: Meal[] = [
  ['Apple with almond butter', 220, 5, 26, 11],
  ['Protein bar', 210, 20, 22, 7],
  ['Handful of mixed nuts', 180, 5, 7, 16],
  ['Latte and a croissant', 330, 8, 32, 18],
  ['Cottage cheese with peaches', 190, 18, 18, 5],
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

/** Deterministic jitter so totals vary day to day but stay plausible. */
function jitter(value: number, seed: number, pct = 0.12): number {
  const f = ((seed % 100) / 100) * 2 - 1; // -1..1
  return Math.round(value * (1 + f * pct));
}

export async function seedIfEmpty(days = 21): Promise<boolean> {
  if (!(await isEmpty())) return false;
  const now = new Date();
  for (let i = days; i >= 1; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = dateKey(d);
    const h = hash(key);
    const meals: Meal[] = [pick(BREAKFASTS, h), pick(LUNCHES, h >> 3), pick(DINNERS, h >> 5)];
    // ~70% of days have a snack
    if (h % 10 < 7) meals.splice(2, 0, pick(SNACKS, h >> 7));
    // ~8% of days skip breakfast
    if (h % 13 === 4) meals.shift();

    for (const [name, cal, p, c, f] of meals) {
      await addEntry({
        date: key,
        name,
        calories: jitter(cal, h + name.length),
        protein: jitter(p, h >> 2, 0.08),
        carbs: jitter(c, h >> 4, 0.08),
        fat: jitter(f, h >> 6, 0.08),
        imageUri: null,
        source: 'manual',
      });
    }
  }
  return true;
}
