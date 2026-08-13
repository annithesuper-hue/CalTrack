import * as SQLite from 'expo-sqlite';

import { dayKey, daysAgo } from './dates';
import { DEFAULT_GOALS } from './nutrition';
import type { DaySummary, Goals, Meal, MealType, Profile } from './types';

/**
 * Per-user local storage.
 *
 * Every signed-in person gets their own SQLite database file on the
 * device (`caltrack_<hash-of-userId>.db`). This is what actually keeps
 * accounts private on a shared device/simulator: switching the active
 * Clerk user switches which database file is open, so a different
 * person's meals/goals/profile are never visible from another account.
 *
 * Before anyone is signed in (during the onboarding funnel, where a
 * profile/goal plan is computed and briefly held before account
 * creation) a throwaway `caltrack_guest.db` is used. That guest data is
 * migrated into the new user's database the moment an account is created
 * (see `adoptGuestData`) and the guest database is then wiped, so it
 * never lingers to leak into someone else's session later.
 */

const GUEST_DB = 'caltrack_guest.db';

/** Keeps filenames filesystem-safe without needing a crypto import here. */
function dbNameForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (Math.imul(31, hash) + userId.charCodeAt(i)) | 0;
  }
  const safeSuffix = userId.replace(/[^a-zA-Z0-9]/g, '').slice(-24);
  return `caltrack_${safeSuffix || 'u'}_${(hash >>> 0).toString(36)}.db`;
}

let activeDb: SQLite.SQLiteDatabase = SQLite.openDatabaseSync(GUEST_DB);
let activeUserId: string | null = null;

function createSchema(target: SQLite.SQLiteDatabase): void {
  target.execSync(`
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
      fiber INTEGER NOT NULL DEFAULT 0,
      photo_uri TEXT,
      note TEXT,
      day TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_meals_day ON meals(day);
  `);
  migrateMealType(target);
  migrateFiber(target);
}

/** Adds the meal_type column for installs that predate meal-type support. */
function migrateMealType(target: SQLite.SQLiteDatabase): void {
  const cols = target.getAllSync<{ name: string }>('PRAGMA table_info(meals)');
  if (cols.some((c) => c.name === 'meal_type')) return;
  target.execSync(`ALTER TABLE meals ADD COLUMN meal_type TEXT NOT NULL DEFAULT 'other';`);
}

/** Adds the fiber column for installs that predate fiber tracking. */
function migrateFiber(target: SQLite.SQLiteDatabase): void {
  const cols = target.getAllSync<{ name: string }>('PRAGMA table_info(meals)');
  if (cols.some((c) => c.name === 'fiber')) return;
  target.execSync(`ALTER TABLE meals ADD COLUMN fiber INTEGER NOT NULL DEFAULT 0;`);
}

/**
 * Opens (creating if needed) the database for a given Clerk user id, or
 * the shared pre-auth "guest" database when `userId` is null (signed
 * out). Must be called before any other function here after the active
 * user changes — `AppProvider` in `store.tsx` does this whenever Clerk's
 * `userId` changes, including on first launch, sign-in, sign-up, sign-out
 * and switching accounts on the same device.
 */
export function setActiveUser(userId: string | null): void {
  if (userId === activeUserId) return;
  const name = userId ? dbNameForUser(userId) : GUEST_DB;
  activeDb = SQLite.openDatabaseSync(name);
  activeUserId = userId;
  createSchema(activeDb);
  if (userId) seedIfNeeded();
}

/**
 * Called once, right after a brand-new account finishes sign-up. Copies
 * over the profile/goals/onboarded flag that were computed during
 * onboarding (before the account existed, so they live in the guest
 * database) into the new user's own database, then clears the guest
 * database so the next person who onboards on this device doesn't
 * inadvertently inherit a stale draft plan from someone else.
 *
 * Deliberately NOT called on sign-in — an existing account's saved data
 * must never be overwritten by whatever happens to be sitting in the
 * device's guest scratch space.
 */
export function adoptGuestData(userId: string): void {
  const guest = SQLite.openDatabaseSync(GUEST_DB);
  createSchema(guest);
  const target = SQLite.openDatabaseSync(dbNameForUser(userId));
  createSchema(target);

  const profileRaw = guest.getFirstSync<{ value: string }>('SELECT value FROM kv WHERE key = ?', 'profile');
  const goalsRaw = guest.getFirstSync<{ value: string }>('SELECT value FROM kv WHERE key = ?', 'goals');

  target.withTransactionSync(() => {
    if (profileRaw) target.runSync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', 'profile', profileRaw.value);
    if (goalsRaw) target.runSync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', 'goals', goalsRaw.value);
    target.runSync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', 'onboarded', '1');
  });

  // Wipe the guest scratch space so it can't be picked up by a different
  // person who lands on the onboarding funnel on this same device later.
  guest.withTransactionSync(() => {
    guest.runSync('DELETE FROM kv');
    guest.runSync('DELETE FROM meals');
  });
}

// ---------- kv ----------

export function kvGet(key: string): string | null {
  const row = activeDb.getFirstSync<{ value: string }>('SELECT value FROM kv WHERE key = ?', key);
  return row?.value ?? null;
}

export function kvSet(key: string, value: string): void {
  activeDb.runSync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', key, value);
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

// ---------- meals ----------

type MealRow = {
  id: string;
  name: string;
  emoji: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  photo_uri: string | null;
  note: string | null;
  meal_type: string;
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
    fiber: row.fiber ?? 0,
    photoUri: row.photo_uri,
    note: row.note,
    mealType: isMealType(row.meal_type) ? row.meal_type : 'other',
    createdAt: row.created_at,
  };
}

function isMealType(value: string): value is MealType {
  return value === 'breakfast' || value === 'lunch' || value === 'dinner' || value === 'snack' || value === 'other';
}

export function getMealsForDay(day: string): Meal[] {
  const rows = activeDb.getAllSync<MealRow>(
    'SELECT * FROM meals WHERE day = ? ORDER BY created_at DESC',
    day,
  );
  return rows.map(rowToMeal);
}

export function getMeal(id: string): Meal | null {
  const row = activeDb.getFirstSync<MealRow>('SELECT * FROM meals WHERE id = ?', id);
  return row ? rowToMeal(row) : null;
}

/** Rounds to the nearest whole unit for storage — the DB is the single point where display-precision rounding happens; every calculation upstream uses full float precision. */
function roundStorable(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

export function insertMeal(meal: Meal): void {
  activeDb.runSync(
    `INSERT INTO meals (id, name, emoji, calories, protein, carbs, fat, fiber, photo_uri, note, meal_type, day, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    meal.id,
    meal.name,
    meal.emoji,
    roundStorable(meal.calories),
    roundStorable(meal.protein),
    roundStorable(meal.carbs),
    roundStorable(meal.fat),
    roundStorable(meal.fiber ?? 0),
    meal.photoUri,
    meal.note,
    meal.mealType,
    dayKey(new Date(meal.createdAt)),
    meal.createdAt,
  );
}

export function updateMeal(meal: Meal): void {
  activeDb.runSync(
    `UPDATE meals SET name = ?, emoji = ?, calories = ?, protein = ?, carbs = ?, fat = ?, fiber = ?, note = ?, meal_type = ?
     WHERE id = ?`,
    meal.name,
    meal.emoji,
    roundStorable(meal.calories),
    roundStorable(meal.protein),
    roundStorable(meal.carbs),
    roundStorable(meal.fat),
    roundStorable(meal.fiber ?? 0),
    meal.note,
    meal.mealType,
    meal.id,
  );
}

export function deleteMeal(id: string): void {
  activeDb.runSync('DELETE FROM meals WHERE id = ?', id);
}

/**
 * Most-recently-logged distinct meals (by name), for the "Recently added"
 * quick-pick list in search — lets someone re-log something they've eaten
 * before in one tap instead of searching for it again.
 */
export function getRecentUniqueMeals(limit = 10): Meal[] {
  const rows = activeDb.getAllSync<MealRow>(
    `SELECT * FROM meals AS m
     WHERE created_at = (SELECT MAX(created_at) FROM meals WHERE name = m.name)
     ORDER BY created_at DESC
     LIMIT ?`,
    limit,
  );
  return rows.map(rowToMeal);
}

export function getDaySummaries(days: string[]): DaySummary[] {
  if (days.length === 0) return [];
  const placeholders = days.map(() => '?').join(',');
  const rows = activeDb.getAllSync<{
    day: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    mealCount: number;
  }>(
    `SELECT day,
            COALESCE(SUM(calories), 0) AS calories,
            COALESCE(SUM(protein), 0) AS protein,
            COALESCE(SUM(carbs), 0) AS carbs,
            COALESCE(SUM(fat), 0) AS fat,
            COALESCE(SUM(fiber), 0) AS fiber,
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
      fiber: r?.fiber ?? 0,
      mealCount: r?.mealCount ?? 0,
    };
  });
}

// ---------- seed ----------

type SeedMeal = { name: string; emoji: string; c: number; p: number; cb: number; f: number; fi: number };

const BREAKFASTS: SeedMeal[] = [
  { name: 'Greek Yogurt & Granola', emoji: '🥣', c: 380, p: 24, cb: 48, f: 11, fi: 4 },
  { name: 'Avocado Toast & Eggs', emoji: '🥑', c: 460, p: 20, cb: 38, f: 26, fi: 8 },
  { name: 'Blueberry Oatmeal', emoji: '🫐', c: 340, p: 12, cb: 58, f: 8, fi: 7 },
  { name: 'Veggie Omelette', emoji: '🍳', c: 350, p: 26, cb: 8, f: 24, fi: 2 },
  { name: 'Banana Protein Smoothie', emoji: '🍌', c: 310, p: 28, cb: 40, f: 5, fi: 3 },
];

const LUNCHES: SeedMeal[] = [
  { name: 'Chicken Caesar Salad', emoji: '🥗', c: 520, p: 42, cb: 18, f: 31, fi: 4 },
  { name: 'Turkey Club Sandwich', emoji: '🥪', c: 610, p: 35, cb: 55, f: 27, fi: 4 },
  { name: 'Poke Bowl', emoji: '🍣', c: 560, p: 34, cb: 62, f: 18, fi: 5 },
  { name: 'Burrito Bowl', emoji: '🌯', c: 680, p: 38, cb: 72, f: 26, fi: 10 },
  { name: 'Tomato Soup & Grilled Cheese', emoji: '🍅', c: 590, p: 21, cb: 58, f: 30, fi: 3 },
];

const DINNERS: SeedMeal[] = [
  { name: 'Salmon, Rice & Broccoli', emoji: '🐟', c: 640, p: 44, cb: 52, f: 27, fi: 4 },
  { name: 'Spaghetti Bolognese', emoji: '🍝', c: 720, p: 34, cb: 82, f: 26, fi: 5 },
  { name: 'Chicken Stir-Fry', emoji: '🥡', c: 580, p: 40, cb: 55, f: 20, fi: 5 },
  { name: 'Steak & Sweet Potato', emoji: '🥩', c: 690, p: 48, cb: 42, f: 34, fi: 5 },
  { name: 'Margherita Pizza (half)', emoji: '🍕', c: 620, p: 26, cb: 74, f: 24, fi: 4 },
];

const SNACKS: SeedMeal[] = [
  { name: 'Apple & Peanut Butter', emoji: '🍎', c: 260, p: 8, cb: 30, f: 14, fi: 5 },
  { name: 'Protein Bar', emoji: '🍫', c: 210, p: 20, cb: 22, f: 7, fi: 3 },
  { name: 'Trail Mix', emoji: '🥜', c: 290, p: 9, cb: 24, f: 19, fi: 3 },
  { name: 'Cottage Cheese & Berries', emoji: '🍓', c: 180, p: 22, cb: 14, f: 4, fi: 2 },
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

  const insert = (seedMeal: SeedMeal, mealType: MealType, date: Date, hour: number, minute: number) => {
    const at = new Date(date);
    at.setHours(hour, minute, 0, 0);
    insertMeal({
      id: `seed-${at.getTime()}-${Math.floor(rand() * 1e6)}`,
      name: seedMeal.name,
      emoji: seedMeal.emoji,
      mealType,
      calories: jitter(seedMeal.c),
      protein: jitter(seedMeal.p),
      carbs: jitter(seedMeal.cb),
      fat: jitter(seedMeal.f),
      fiber: jitter(seedMeal.fi),
      photoUri: null,
      note: null,
      createdAt: at.getTime(),
    });
  };

  activeDb.withTransactionSync(() => {
    for (let i = 14; i >= 1; i--) {
      const date = daysAgo(i);
      const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
      insert(pick(BREAKFASTS), 'breakfast', date, 8, 15 + Math.floor(rand() * 40));
      insert(pick(LUNCHES), 'lunch', date, 12, 30 + Math.floor(rand() * 30));
      if (rand() > 0.35) insert(pick(SNACKS), 'snack', date, 16, Math.floor(rand() * 50));
      // The occasional light day keeps the chart honest.
      if (rand() > 0.12) insert(pick(DINNERS), 'dinner', date, 19, Math.floor(rand() * 45));
    }
    kvSet('seeded', '1');
  });
}
