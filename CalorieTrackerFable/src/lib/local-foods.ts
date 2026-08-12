/**
 * Small built-in database of common generic / non-branded foods — raw
 * ingredients, staples, and homemade dishes that USDA FoodData Central
 * either doesn't carry, buries under a wall of branded products, or lists
 * with missing/zero calorie values.
 *
 * This exists specifically to fix the "search 'raw rice' and only get
 * branded products, some with no calories" problem: these entries are
 * always included in local search results (see food-search.ts), merged
 * in alongside USDA/OpenFoodFacts results, so a generic query reliably
 * surfaces a plain, trustworthy answer even when the online sources are
 * noisy for that query.
 *
 * Values are typical reference figures per 100g (raw/uncooked unless the
 * name says "cooked"), sourced from standard nutrition references
 * (USDA SR Legacy / IFCT patterns). They're approximations meant for quick
 * logging, not lab-grade precision — same spirit as everything else in this
 * app, which is fully editable after picking a result.
 */

import { IFCT_FOODS } from './ifct-foods';
import type { MacroSet } from './types';

export type LocalFoodExtras = { fiber: number; sugar: number; sodium: number };

export type LocalFood = {
  id: string;
  name: string;
  /** Extra search terms — Hindi/Hinglish names, common spellings, etc. */
  aliases: string[];
  /** Nutrition per 100g (or per 100ml for liquids), raw/uncooked unless noted. */
  per100g: MacroSet & LocalFoodExtras;
  /** A sensible default amount to prefill when this food is picked. */
  defaultGrams: number;
  /** Shown as the unit in the UI — 'g' for solids, 'ml' for liquids. */
  unit: 'g' | 'ml';
};

function food(
  name: string,
  aliases: string[],
  macros: MacroSet & LocalFoodExtras,
  defaultGrams: number,
  unit: 'g' | 'ml' = 'g',
): LocalFood {
  return {
    id: `local:${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name,
    aliases,
    per100g: macros,
    defaultGrams,
    unit,
  };
}

const m = (calories: number, protein: number, carbs: number, fat: number, fiber = 0, sugar = 0, sodium = 0) => ({
  calories,
  protein,
  carbs,
  fat,
  fiber,
  sugar,
  sodium,
});

export const LOCAL_FOODS: LocalFood[] = [
  // --- Grains & staples ---
  food('Rice, raw (white)', ['chawal', 'chaawal', 'raw rice', 'white rice raw', 'basmati raw'], m(365, 7.1, 79, 0.7, 1.3, 0.1, 1), 100),
  food('Rice, cooked (white)', ['chawal pakaya', 'cooked rice', 'boiled rice'], m(130, 2.7, 28, 0.3, 0.4, 0, 1), 150),
  food('Brown rice, raw', ['brown chawal'], m(370, 7.9, 77, 2.9, 3.5, 0.9, 5), 100),
  food('Wheat flour (atta)', ['atta', 'gehun ka atta', 'whole wheat flour'], m(340, 12, 72, 1.7, 11, 0.4, 2), 100),
  food('Roti / Chapati', ['chapati', 'phulka', 'roti'], m(297, 9.7, 58, 3.7, 8, 0.5, 200), 40),
  food('Naan', ['naan bread'], m(310, 9, 50, 8, 2, 3, 500), 90),
  food('Poha (flattened rice, raw)', ['chura', 'flattened rice', 'beaten rice'], m(346, 6.6, 77, 1.2, 2.3, 0, 5), 60),
  food('Poha, cooked (dish)', ['poha nashta', 'cooked poha'], m(158, 3, 27, 4.5, 1.5, 1, 300), 200),
  food('Upma (dish)', ['suji upma', 'rava upma'], m(150, 3.5, 20, 6, 1.5, 1, 300), 200),
  food('Oats, raw', ['jai', 'rolled oats', 'oatmeal raw'], m(389, 16.9, 66, 6.9, 10.6, 1, 2), 40),
  food('Semolina / Sooji (raw)', ['rava', 'sooji', 'suji'], m(360, 10.4, 73, 1, 3.9, 0, 1), 60),
  food('Bread, white', ['white bread slice', 'pav'], m(265, 9, 49, 3.2, 2.7, 5, 490), 60),
  food('Bread, whole wheat', ['brown bread', 'wheat bread'], m(247, 13, 41, 3.4, 7, 6, 450), 60),
  food('Quinoa, raw', ['kinwa'], m(368, 14.1, 64, 6.1, 7, 0, 5), 60),
  food('Idli (dish)', ['idly'], m(150, 4, 30, 0.7, 1, 0, 250), 100),
  food('Dosa, plain (dish)', ['dosa'], m(168, 3.9, 28, 4, 1.5, 0, 250), 100),
  food('Paratha, plain', ['plain paratha'], m(280, 6.5, 36, 12, 3, 0.5, 300), 60),

  // --- Legumes / pulses / soy ---
  food('Toor dal / Arhar dal, raw', ['arhar dal', 'toor dal', 'pigeon pea'], m(343, 22.3, 57, 1.5, 15, 3, 5), 40),
  food('Moong dal, raw', ['moong dal', 'green gram dal'], m(347, 24, 59, 1.2, 16, 2, 10), 40),
  food('Chana dal, raw', ['chana dal', 'split chickpea'], m(364, 20.8, 61, 5.6, 17, 6, 20), 40),
  food('Masoor dal, raw', ['masoor dal', 'red lentil raw'], m(352, 24.6, 60, 1.1, 11, 2, 6), 40),
  food('Rajma / Kidney beans, raw', ['rajma', 'kidney beans'], m(333, 24, 60, 0.8, 25, 2, 10), 50),
  food('Chickpeas / Chole, raw', ['chana', 'chole', 'kabuli chana', 'garbanzo'], m(364, 19, 61, 6, 17, 11, 24), 50),
  food('Soya chunks, raw', ['soya chunks', 'nutrela', 'meal maker'], m(345, 52, 33, 0.5, 13, 6, 10), 30),
  food('Dal, cooked (generic)', ['dal fry', 'cooked dal', 'dal tadka'], m(116, 7, 20, 0.4, 5, 1, 300), 200),
  food('Peanuts, raw', ['moongfali', 'groundnut'], m(567, 25.8, 16, 49, 8.5, 4, 18), 30),
  food('Tofu', ['soya paneer', 'bean curd'], m(76, 8, 1.9, 4.8, 0.3, 0.6, 7), 100),

  // --- Dairy & eggs ---
  food('Milk, whole', ['doodh', 'full cream milk'], m(61, 3.2, 4.8, 3.3, 0, 5, 40), 200, 'ml'),
  food('Milk, toned/skim', ['toned doodh', 'skim milk', 'low fat milk'], m(42, 3.4, 5, 1, 0, 5, 44), 200, 'ml'),
  food('Curd / Dahi, plain', ['dahi', 'yogurt', 'plain yogurt'], m(60, 3.5, 4.7, 3.1, 0, 4.7, 36), 150, 'ml'),
  food('Paneer', ['panir', 'cottage cheese indian'], m(265, 18.3, 1.2, 20.8, 0, 1, 18), 50),
  food('Ghee', ['clarified butter'], m(900, 0, 0, 100, 0, 0, 0), 10),
  food('Butter', ['makhan'], m(717, 0.9, 0.1, 81, 0, 0.1, 11), 10),
  food('Cheese, cheddar', ['cheese slice'], m(403, 25, 1.3, 33, 0, 0.5, 620), 20),
  food('Egg, whole (raw)', ['anda', 'egg raw', 'whole egg'], m(143, 12.6, 0.7, 9.5, 0, 0.4, 142), 50),
  food('Egg, boiled', ['boiled anda', 'boiled egg'], m(155, 13, 1.1, 11, 0, 1.1, 124), 50),
  food('Egg white', ['anda safed'], m(52, 10.9, 0.7, 0.2, 0, 0.7, 166), 33),

  // --- Meat, poultry, fish (raw unless noted) ---
  food('Chicken breast, raw (skinless)', ['chicken breast raw', 'murga chest'], m(120, 22.5, 0, 2.6, 0, 0, 65), 100),
  food('Chicken breast, cooked (grilled/boiled)', ['grilled chicken breast', 'boiled chicken breast'], m(165, 31, 0, 3.6, 0, 0, 74), 100),
  food('Chicken thigh, raw', ['chicken leg raw'], m(177, 17.9, 0, 11.4, 0, 0, 78), 100),
  food('Chicken curry (dish, home-style)', ['chicken curry', 'murgh curry'], m(180, 15, 5, 11, 1, 2, 400), 200),
  food('Mutton / Goat meat, raw', ['bakra mutton', 'goat meat raw'], m(143, 21, 0, 6, 0, 0, 70), 100),
  food('Fish, raw (generic, e.g. rohu)', ['machli', 'fish raw', 'rohu'], m(97, 18, 0, 2.5, 0, 0, 55), 100),
  food('Prawns / Shrimp, raw', ['jhinga', 'prawns'], m(85, 20, 0.2, 0.5, 0, 0, 119), 100),

  // --- Vegetables ---
  food('Potato, raw', ['aloo', 'batata'], m(77, 2, 17, 0.1, 2.2, 0.8, 6), 100),
  food('Onion, raw', ['pyaz', 'kanda'], m(40, 1.1, 9.3, 0.1, 1.7, 4.2, 4), 100),
  food('Tomato, raw', ['tamatar'], m(18, 0.9, 3.9, 0.2, 1.2, 2.6, 5), 100),
  food('Spinach, raw', ['palak'], m(23, 2.9, 3.6, 0.4, 2.2, 0.4, 79), 100),
  food('Cauliflower, raw', ['gobi', 'phool gobi'], m(25, 1.9, 5, 0.3, 2, 1.9, 30), 100),
  food('Cabbage, raw', ['patta gobi', 'bandh gobi'], m(25, 1.3, 5.8, 0.1, 2.5, 3.2, 18), 100),
  food('Carrot, raw', ['gajar'], m(41, 0.9, 9.6, 0.2, 2.8, 4.7, 69), 100),
  food('Cucumber, raw', ['kheera'], m(15, 0.7, 3.6, 0.1, 0.5, 1.7, 2), 100),
  food('Bell pepper / Capsicum, raw', ['shimla mirch', 'capsicum'], m(31, 1, 6, 0.3, 2.1, 4.2, 4), 100),
  food('Green peas, raw', ['matar', 'hara matar'], m(81, 5.4, 14, 0.4, 5.1, 5.7, 5), 80),
  food('Bottle gourd, raw', ['lauki', 'ghiya'], m(14, 0.6, 3.4, 0, 0.5, 1.5, 2), 150),
  food('Brinjal / Eggplant, raw', ['baingan'], m(25, 1, 6, 0.2, 3, 3.5, 2), 100),
  food('Okra / Bhindi, raw', ['bhindi', 'ladyfinger'], m(33, 1.9, 7.5, 0.2, 3.2, 1.5, 7), 100),

  // --- Fruits ---
  food('Banana', ['kela'], m(89, 1.1, 23, 0.3, 2.6, 12, 1), 120),
  food('Apple', ['seb'], m(52, 0.3, 14, 0.2, 2.4, 10, 1), 150),
  food('Mango', ['aam'], m(60, 0.8, 15, 0.4, 1.6, 14, 1), 150),
  food('Orange', ['santra'], m(47, 0.9, 12, 0.1, 2.4, 9, 0), 130),
  food('Papaya', ['papita'], m(43, 0.5, 11, 0.3, 1.7, 8, 8), 150),
  food('Grapes', ['angoor'], m(69, 0.7, 18, 0.2, 0.9, 16, 2), 100),
  food('Guava', ['amrud'], m(68, 2.6, 14, 1, 5.4, 9, 2), 100),
  food('Watermelon', ['tarbooz'], m(30, 0.6, 8, 0.2, 0.4, 6, 1), 200),
  food('Pomegranate', ['anar'], m(83, 1.7, 19, 1.2, 4, 14, 3), 100),
  food('Dates, dried', ['khajoor'], m(277, 1.8, 75, 0.2, 6.7, 63, 1), 20),
  food('Almonds', ['badam'], m(579, 21.2, 22, 49.9, 12.5, 4.4, 1), 20),
  food('Cashews', ['kaju'], m(553, 18.2, 30, 44, 3.3, 5.9, 12), 20),
  food('Walnuts', ['akhrot'], m(654, 15.2, 14, 65, 6.7, 2.6, 2), 20),
  food('Raisins', ['kishmish'], m(299, 3.1, 79, 0.5, 3.7, 59, 11), 20),

  // --- Fats / condiments / sugars ---
  food('Cooking oil (generic, refined)', ['tel', 'refined oil', 'sunflower oil', 'vegetable oil', 'mustard oil'], m(884, 0, 0, 100, 0, 0, 0), 5, 'ml'),
  food('Sugar, white', ['cheeni', 'chini', 'table sugar'], m(387, 0, 100, 0, 0, 100, 1), 5),
  food('Honey', ['shahad'], m(304, 0.3, 82, 0, 0.2, 82, 4), 10, 'ml'),
  food('Salt', ['namak', 'table salt'], m(0, 0, 0, 0, 0, 0, 38758), 2),

  // --- Common prepared/mixed dishes ---
  food('Biryani (dish, mixed veg/chicken)', ['biryani'], m(165, 7, 20, 6, 1, 1, 400), 250),
  food('Samosa', ['samosa'], m(308, 5, 32, 18, 2.5, 2, 430), 60),
  food('Pakora / Bhajiya', ['pakoda', 'bhajiya', 'pakora'], m(315, 7, 28, 20, 3, 2, 380), 60),
  food('Sabzi, mixed vegetable (dish)', ['mix sabzi', 'sabji'], m(90, 2.5, 10, 4.5, 2.5, 3, 350), 200),
  food('Paneer curry / Paneer masala (dish)', ['paneer sabzi', 'paneer masala', 'paneer curry'], m(220, 10, 8, 17, 1, 3, 450), 200),
  food('Dal makhani (dish)', ['dal makhani'], m(160, 7, 14, 9, 4, 2, 450), 200),
  food('Khichdi (dish)', ['khichdi'], m(120, 4, 20, 2.5, 1.5, 0.5, 300), 200),
  food('Curd rice (dish)', ['curd rice', 'dahi chawal'], m(120, 3, 18, 3.5, 0.5, 2, 250), 200),
  food('Chicken wings, fried', ['fried chicken wings', 'kfc wings', 'crispy chicken wings'], m(290, 20, 8, 20, 0.5, 0.5, 550), 100),
  food('French fries', ['fries', 'aloo fries', 'finger chips'], m(312, 3.4, 41, 15, 3.8, 0.5, 210), 100),
];

/**
 * Combined search pool: the hand-picked, alias-rich staples above (best
 * match quality for common Hinglish queries like "chawal" or "aloo") plus
 * the full IFCT 2017 dataset (much broader raw-ingredient coverage). When
 * both have an entry for the same food, the hand-picked one wins — it has
 * better aliases — so IFCT only fills gaps rather than duplicating rows.
 */
const CURATED_NAMES = new Set(LOCAL_FOODS.map((f) => f.name.toLowerCase()));
const SEARCH_POOL: LocalFood[] = [...LOCAL_FOODS, ...IFCT_FOODS.filter((f) => !CURATED_NAMES.has(f.name.toLowerCase()))];

/** Simple tokenized match: every query word must appear in the name or an alias. */
export function searchLocalFoods(query: string, limit = 12): LocalFood[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const words = q.split(/\s+/).filter(Boolean);

  const scored = SEARCH_POOL.map((f) => {
    const haystack = `${f.name} ${f.aliases.join(' ')}`.toLowerCase();
    const matchesAll = words.every((w) => haystack.includes(w));
    if (!matchesAll) return null;
    // Prefer foods whose primary name starts with the query, then whose
    // name contains it, then alias-only matches.
    const nameLower = f.name.toLowerCase();
    let score = 0;
    if (nameLower.startsWith(q)) score = 3;
    else if (nameLower.includes(q)) score = 2;
    else if (f.aliases.some((a) => a.toLowerCase().startsWith(q))) score = 1.5;
    else score = 1;
    return { food: f, score };
  }).filter((x): x is { food: LocalFood; score: number } => x !== null);

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.food);
}
