import type { SQLiteDatabase } from 'expo-sqlite';

import { addDays, localDay } from '@/lib/date';
import { DEFAULT_GOALS, type DailySummary, type Goals, type MealRecord } from '@/lib/types';

type MealRow = {
  id: number;
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
  items: string;
  eaten_at: string;
  day: string;
  image_uri: string | null;
};

const seedMeals = [
  ['Greek yogurt bowl', 'Greek yogurt, berries, granola and honey', 430, 29, 54, 11],
  ['Chicken grain bowl', 'Chicken, brown rice, greens and avocado', 684, 48, 71, 23],
  ['Salmon & vegetables', 'Roasted salmon, potatoes and asparagus', 617, 45, 49, 25],
  ['Egg & avocado toast', 'Sourdough, eggs, avocado and tomatoes', 512, 25, 46, 26],
  ['Turkey pesto sandwich', 'Turkey, pesto, greens and mozzarella', 595, 43, 57, 22],
  ['Tofu stir-fry', 'Tofu, vegetables and sesame noodles', 660, 34, 82, 24],
] as const;

function mapMeal(row: MealRow): MealRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    confidence: row.confidence,
    items: JSON.parse(row.items) as string[],
    eatenAt: row.eaten_at,
    day: row.day,
    imageUri: row.image_uri,
  };
}

export async function migrateDatabase(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      calories INTEGER NOT NULL,
      protein INTEGER NOT NULL,
      carbs INTEGER NOT NULL,
      fat INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      calories INTEGER NOT NULL,
      protein INTEGER NOT NULL,
      carbs INTEGER NOT NULL,
      fat INTEGER NOT NULL,
      confidence REAL NOT NULL DEFAULT 0.8,
      items TEXT NOT NULL DEFAULT '[]',
      eaten_at TEXT NOT NULL,
      day TEXT NOT NULL,
      image_uri TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_meals_day ON meals(day);
  `);

  await db.runAsync(
    `INSERT OR IGNORE INTO goals (id, calories, protein, carbs, fat) VALUES (1, ?, ?, ?, ?)`,
    DEFAULT_GOALS.calories,
    DEFAULT_GOALS.protein,
    DEFAULT_GOALS.carbs,
    DEFAULT_GOALS.fat
  );

  const seeded = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM settings WHERE key = 'seeded'`
  );
  if (!seeded) {
    const now = new Date();
    for (let offset = -14; offset <= -1; offset += 1) {
      const date = addDays(now, offset);
      const day = localDay(date);
      const dailyScale = 0.86 + ((offset * 17) % 13) / 100;
      for (let mealIndex = 0; mealIndex < 3; mealIndex += 1) {
        const seed = seedMeals[(Math.abs(offset) + mealIndex * 2) % seedMeals.length];
        const eatenAt = new Date(date);
        eatenAt.setHours(8 + mealIndex * 5, 20 + (Math.abs(offset) % 4) * 7, 0, 0);
        await db.runAsync(
          `INSERT INTO meals
            (name, description, calories, protein, carbs, fat, confidence, items, eaten_at, day, image_uri)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
          seed[0],
          seed[1],
          Math.round(seed[2] * dailyScale),
          Math.round(seed[3] * dailyScale),
          Math.round(seed[4] * dailyScale),
          Math.round(seed[5] * dailyScale),
          0.88,
          JSON.stringify(seed[1].split(', ')),
          eatenAt.toISOString(),
          day
        );
      }
    }
    await db.runAsync(`INSERT INTO settings (key, value) VALUES ('seeded', '1')`);
  }
}

export async function getGoals(db: SQLiteDatabase): Promise<Goals> {
  const row = await db.getFirstAsync<Goals>(
    `SELECT calories, protein, carbs, fat FROM goals WHERE id = 1`
  );
  return row ?? DEFAULT_GOALS;
}

export async function saveGoals(db: SQLiteDatabase, goals: Goals) {
  await db.runAsync(
    `UPDATE goals SET calories = ?, protein = ?, carbs = ?, fat = ? WHERE id = 1`,
    goals.calories,
    goals.protein,
    goals.carbs,
    goals.fat
  );
}

export async function getSetting(db: SQLiteDatabase, key: string) {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM settings WHERE key = ?`,
    key
  );
  return row?.value;
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string) {
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    value
  );
}

export async function getMealsForDay(db: SQLiteDatabase, day: string) {
  const rows = await db.getAllAsync<MealRow>(
    `SELECT * FROM meals WHERE day = ? ORDER BY eaten_at DESC`,
    day
  );
  return rows.map(mapMeal);
}

export async function insertMeal(
  db: SQLiteDatabase,
  meal: Omit<MealRecord, 'id' | 'day' | 'eatenAt'>,
  eatenAt = new Date()
) {
  await db.runAsync(
    `INSERT INTO meals
      (name, description, calories, protein, carbs, fat, confidence, items, eaten_at, day, image_uri)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    meal.name,
    meal.description,
    Math.round(meal.calories),
    Math.round(meal.protein),
    Math.round(meal.carbs),
    Math.round(meal.fat),
    meal.confidence,
    JSON.stringify(meal.items),
    eatenAt.toISOString(),
    localDay(eatenAt),
    meal.imageUri
  );
}

export async function deleteMeal(db: SQLiteDatabase, id: number) {
  await db.runAsync(`DELETE FROM meals WHERE id = ?`, id);
}

export async function getHistory(db: SQLiteDatabase, days = 14): Promise<DailySummary[]> {
  const start = localDay(addDays(new Date(), -(days - 1)));
  const rows = await db.getAllAsync<DailySummary>(
    `SELECT day,
      CAST(COALESCE(SUM(calories), 0) AS INTEGER) AS calories,
      CAST(COALESCE(SUM(protein), 0) AS INTEGER) AS protein,
      CAST(COALESCE(SUM(carbs), 0) AS INTEGER) AS carbs,
      CAST(COALESCE(SUM(fat), 0) AS INTEGER) AS fat
     FROM meals WHERE day >= ? GROUP BY day ORDER BY day ASC`,
    start
  );
  const byDay = new Map(rows.map((row) => [row.day, row]));
  return Array.from({ length: days }, (_, index) => {
    const day = localDay(addDays(new Date(), index - (days - 1)));
    return byDay.get(day) ?? { day, calories: 0, protein: 0, carbs: 0, fat: 0 };
  });
}

