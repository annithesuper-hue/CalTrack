import * as SQLite from 'expo-sqlite';

import { dayKey, daysAgo } from './dates';
import { DEFAULT_GOALS } from './nutrition';
import type { DaySummary, Goals, Meal, Profile } from './types';

const db = SQLite.openDatabaseSync('caltrack.db');

export function initDb(): void {
  db.execSync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS meals (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      emoji TEXT NOT NULL DEFAULT '🍽️',
      calories INTEGER NOT NULL,
      protein INTEGER NOT NULL,
      carbs INTEGER NOT NULL,
      fat INTEGER NOT NULL,
      photo_uri TEXT,
      note TEXT,
      day TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_meals_day ON meals(day);
  `);

  // Add serving columns if they don't exist (safe for existing installs)
  try {
    db.execSync(`ALTER TABLE meals ADD COLUMN serving_size TEXT;`);
  } catch {
    // Column already exists
  }
  try {
    db.execSync(`ALTER TABLE meals ADD COLUMN servings REAL NOT NULL DEFAULT 1;`);
  } catch {
    // Column already exists
  }


  // Add serving columns if they don't exist (safe for existing installs)
  try {
    db.execSync(`ALTER TABLE meals ADD COLUMN serving_size TEXT;`);
  } catch {
    // Column already exists
  }
  try {
    db.execSync(`ALTER TABLE meals ADD COLUMN servings REAL NOT NULL DEFAULT 1;`);
  } catch {
    // Column already exists
  }

  seedIfNeeded();
}

// ---------- kv ----------

export function kvGet(key: string): string | null {
  const row = db.getFirstSync<{ value: string }>('SELECT value FROM kv WHERE key = ?', key);
  return row?.value ?? null;
}

export function kvSet(key: string, value: string): void {
  db.runSync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', key, value);
}

export function kvGetJson<T>(key: string): T | null {
  const raw = kvGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ---------- goals & profile ----------

export function getGoals(): Goals {
  return kvGetJson<Goals>('goals') ?? DEFAULT_GOALS;
}

export function setGoals(goals: Goals): void {
  kvSet('goals', JSON.stringify(goals));
}

export function getProfile(): Profile | null {
  return kvGetJson<Profile>('profile');
}

export function setProfile(profile: Profile): void {
  kvSet('profile', JSON.stringify(profile));
}
  serving_size: string | null;
  servings: number;

// ---------- meals ----------

type MealRow = {
  id: string;
  name: string;
  emoji: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  photo_uri: string | null;
  note: string | null;
  serving_size: string | null;
    servingSize: row.serving_size ?? null,
    servings: row.servings ?? 1,
  servings: number;
  created_at: number;
};

function rowToMeal(row: MealRow): Meal {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    photoUri: row.photo_uri,
    note: row.note,
    servingSize: row.serving_size ?? null,
    servings: row.servings ?? 1,
    createdAt: row.created_at,
  };
}

export function getMealsForDay(day: string): Meal[] {
  const rows = db.getAllSync<MealRow>(
    'SELECT * FROM meals WHERE day = ? ORDER BY created_at DESC',
    day,
  );
  return rows.map(rowToMeal);
}

export function getMeal(id: string): Meal | null {
  const row = db.getFirstSync<MealRow>('SELECT * FROM meals WHERE id = ?', id);
  return row ? rowToMeal(row) : null;
}

export function insertMeal(meal: Meal): void {
  db.runSync(
    `INSERT INTO meals (id, name, emoji, calories, protein, carbs, fat, photo_uri, note, serving_size, servings, day, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    meal.id,
    meal.name,
    meal.emoji,
    Math.round(meal.calories),
    Math.round(meal.protein),
    Math.round(meal.carbs),
    Math.round(meal.fat),
    meal.photoUri,
    meal.note,
    meal.servingSize ?? null,
    meal.servings ?? 1,
    dayKey(new Date(meal.createdAt)),
    meal.createdAt,
  );
}

export function updateMeal(meal: Meal): void {
  db.runSync(
    `UPDATE meals SET name = ?, emoji = ?, calories = ?, protein = ?, carbs = ?, fat = ?, note = ?, serving_size = ?, servings = ?
     WHERE id = ?`,
    meal.name,
    meal.emoji,
    Math.round(meal.calories),
    Math.round(meal.protein),
    Math.round(meal.carbs),
    Math.round(meal.fat),
    meal.note,
    meal.servingSize ?? null,
    meal.servings ?? 1,
    meal.id,
  );
}

export function deleteMeal(id: string): void {
  db.runSync('DELETE FROM meals WHERE id = ?', id);
}

export function getDaySummaries(days: string[]): DaySummary[] {
  const placeholders = days.map(() => '?').join(',');
  const rows = db.getAllSync<{
    day: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    mealCount: number;
  }>(
    `SELECT day,
            COALESCE(SUM(calories), 0) AS calories,
            COALESCE(SUM(protein), 0) AS protein,
            COALESCE(SUM(carbs), 0) AS carbs,
            COALESCE(SUM(fat), 0) AS fat,
            COUNT(*) AS mealCount
     FROM meals WHERE day IN (${placeholders}) GROUP BY day`,
    ...days,
  );
  const byDay = new Map(rows.map((r) => [r.day, r]));
  return days.map((day) => {
    const r = byDay.get(day);
    return {
      day,
      calories: r?.calories ?? 0,
      protein: r?.protein ?? 0,
      carbs: r?.carbs ?? 0,
      fat: r?.fat ?? 0,
      mealCount: r?.mealCount ?? 0,
    };
  });
}

// ---------- seed ----------

type SeedMeal = { name: string; emoji: string; c: number; p: number; cb: number; f: number };

const BREAKFASTS: SeedMeal[] = [
  { name: 'Greek Yogurt & Granola', emoji: '🥣', c: 380, p: 24, cb: 48, f: 11 },
  { name: 'Avocado Toast & Eggs', emoji: '🥑', c: 460, p: 20, cb: 38, f: 26 },
  { name: 'Blueberry Oatmeal', emoji: '🫐', c: 340, p: 12, cb: 58, f: 8 },
  { name: 'Veggie Omelette', emoji: '🍳', c: 350, p: 26, cb: 8, f: 24 },
  { name: 'Banana Protein Smoothie', emoji: '🍌', c: 310, p: 28, cb: 40, f: 5 },
];

const LUNCHES: SeedMeal[] = [
  { name: 'Chicken Caesar Salad', emoji: '🥗', c: 520, p: 42, cb: 18, f: 31 },
  { name: 'Turkey Club Sandwich', emoji: '🥪', c: 610, p: 35, cb: 55, f: 27 },
  { name: 'Poke Bowl', emoji: '🍣', c: 560, p: 34, cb: 62, f: 18 },
  { name: 'Burrito Bowl', emoji: '🌯', c: 680, p: 38, cb: 72, f: 26 },
  { name: 'Tomato Soup & Grilled Cheese', emoji: '🍅', c: 590, p: 21, cb: 58, f: 30 },
];

const DINNERS: SeedMeal[] = [
  { name: 'Salmon, Rice & Broccoli', emoji: '🐟', c: 640, p: 44, cb: 52, f: 27 },
  { name: 'Spaghetti Bolognese', emoji: '🍝', c: 720, p: 34, cb: 82, f: 26 },
  { name: 'Chicken Stir-Fry', emoji: '🥡', c: 580, p: 40, cb: 55, f: 20 },
  { name: 'Steak & Sweet Potato', emoji: '🥩', c: 690, p: 48, cb: 42, f: 34 },
  { name: 'Margherita Pizza (half)', emoji: '🍕', c: 620, p: 26, cb: 74, f: 24 },
];

const SNACKS: SeedMeal[] = [
  { name: 'Apple & Peanut Butter', emoji: '🍎', c: 260, p: 8, cb: 30, f: 14 },
  { name: 'Protein Bar', emoji: '🍫', c: 210, p: 20, cb: 22, f: 7 },
  { name: 'Trail Mix', emoji: '🥜', c: 290, p: 9, cb: 24, f: 19 },
  { name: 'Cottage Cheese & Berries', emoji: '🍓', c: 180, p: 22, cb: 14, f: 4 },
];

/** Deterministic PRNG so the seeded history is stable across reinstalls. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedIfNeeded(): void {
  if (kvGet('seeded') === '1') return;
  const rand = mulberry32(20260723);
  const jitter = (v: number, spread = 0.12) => Math.round(v * (1 + (rand() - 0.5) * 2 * spread));

  const insert = (seedMeal: SeedMeal, date: Date, hour: number, minute: number) => {
    const at = new Date(date);
    at.setHours(hour, minute, 0, 0);
    insertMeal({
      id: `seed-${at.getTime()}-${Math.floor(rand() * 1e6)}`,
      name: seedMeal.name,
      emoji: seedMeal.emoji,
      calories: jitter(seedMeal.c),
      protein: jitter(seedMeal.p),
      carbs: jitter(seedMeal.cb),
      fat: jitter(seedMeal.f),
      photoUri: null,
      note: null,
      servingSize: null,
      servings: 1,
      createdAt: at.getTime(),
    });
  };

  db.withTransactionSync(() => {
    for (let i = 14; i >= 1; i--) {
      const date = daysAgo(i);
      const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
      insert(pick(BREAKFASTS), date, 8, 15 + Math.floor(rand() * 40));
      insert(pick(LUNCHES), date, 12, 30 + Math.floor(rand() * 30));
      if (rand() > 0.35) insert(pick(SNACKS), date, 16, Math.floor(rand() * 50));
      // The occasional light day keeps the chart honest.
      if (rand() > 0.12) insert(pick(DINNERS), date, 19, Math.floor(rand() * 45));
    }
    kvSet('seeded', '1');
  });
}
