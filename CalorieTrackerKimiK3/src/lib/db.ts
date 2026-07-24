import * as SQLite from 'expo-sqlite';

import { DaySummary, FoodEntry, Goals, NewFoodEntry, Profile } from './types';

export const DEFAULT_GOALS: Goals = { calories: 2200, protein: 140, carbs: 220, fat: 73 };

let db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('caltrack.db');
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS entries (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        name TEXT NOT NULL,
        calories REAL NOT NULL,
        protein REAL NOT NULL,
        carbs REAL NOT NULL,
        fat REAL NOT NULL,
        image_uri TEXT,
        source TEXT NOT NULL DEFAULT 'manual',
        synced_to_health INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);
      CREATE TABLE IF NOT EXISTS kv (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }
  return db;
}

interface EntryRow {
  id: string;
  date: string;
  created_at: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image_uri: string | null;
  source: string;
  synced_to_health: number;
}

function rowToEntry(r: EntryRow): FoodEntry {
  return {
    id: r.id,
    date: r.date,
    createdAt: r.created_at,
    name: r.name,
    calories: r.calories,
    protein: r.protein,
    carbs: r.carbs,
    fat: r.fat,
    imageUri: r.image_uri,
    source: r.source === 'camera' ? 'camera' : 'manual',
    syncedToHealth: r.synced_to_health === 1,
  };
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function addEntry(e: NewFoodEntry): Promise<FoodEntry> {
  const d = await getDb();
  const entry: FoodEntry = { ...e, id: newId(), createdAt: Date.now(), syncedToHealth: false };
  await d.runAsync(
    `INSERT INTO entries (id, date, created_at, name, calories, protein, carbs, fat, image_uri, source, synced_to_health)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    entry.id,
    entry.date,
    entry.createdAt,
    entry.name,
    entry.calories,
    entry.protein,
    entry.carbs,
    entry.fat,
    entry.imageUri,
    entry.source
  );
  return entry;
}

export async function updateEntry(id: string, patch: Partial<NewFoodEntry>): Promise<void> {
  const d = await getDb();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  const map: Record<string, string> = {
    name: 'name',
    calories: 'calories',
    protein: 'protein',
    carbs: 'carbs',
    fat: 'fat',
    imageUri: 'image_uri',
    date: 'date',
    source: 'source',
  };
  for (const [k, col] of Object.entries(map)) {
    if (k in patch) {
      fields.push(`${col} = ?`);
      values.push((patch as Record<string, unknown>)[k] as string | number | null);
    }
  }
  if (fields.length === 0) return;
  values.push(id);
  await d.runAsync(`UPDATE entries SET ${fields.join(', ')} WHERE id = ?`, ...values);
}

export async function deleteEntry(id: string): Promise<void> {
  const d = await getDb();
  await d.runAsync('DELETE FROM entries WHERE id = ?', id);
}

export async function getEntriesForDate(date: string): Promise<FoodEntry[]> {
  const d = await getDb();
  const rows = await d.getAllAsync<EntryRow>(
    'SELECT * FROM entries WHERE date = ? ORDER BY created_at ASC',
    date
  );
  return rows.map(rowToEntry);
}

/** Daily summaries for a set of day keys; days without entries are included with zeros. */
export async function getDaySummaries(dates: string[]): Promise<DaySummary[]> {
  const d = await getDb();
  const out = new Map<string, DaySummary>(
    dates.map((date) => [date, { date, calories: 0, protein: 0, carbs: 0, fat: 0, entryCount: 0 }])
  );
  if (dates.length > 0) {
    const placeholders = dates.map(() => '?').join(',');
    const rows = await d.getAllAsync<{
      date: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      n: number;
    }>(
      `SELECT date, SUM(calories) AS calories, SUM(protein) AS protein, SUM(carbs) AS carbs, SUM(fat) AS fat, COUNT(*) AS n
       FROM entries WHERE date IN (${placeholders}) GROUP BY date`,
      ...dates
    );
    for (const r of rows) {
      out.set(r.date, {
        date: r.date,
        calories: r.calories,
        protein: r.protein,
        carbs: r.carbs,
        fat: r.fat,
        entryCount: r.n,
      });
    }
  }
  return dates.map((date) => out.get(date)!);
}

export async function markSyncedToHealth(id: string): Promise<void> {
  const d = await getDb();
  await d.runAsync('UPDATE entries SET synced_to_health = 1 WHERE id = ?', id);
}

async function kvGet<T>(key: string): Promise<T | null> {
  const d = await getDb();
  const row = await d.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', key);
  return row ? (JSON.parse(row.value) as T) : null;
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  const d = await getDb();
  await d.runAsync(
    'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    JSON.stringify(value)
  );
}

export async function getGoals(): Promise<Goals> {
  return (await kvGet<Goals>('goals')) ?? DEFAULT_GOALS;
}

export async function setGoals(goals: Goals): Promise<void> {
  await kvSet('goals', goals);
}

export async function getProfile(): Promise<Profile | null> {
  return kvGet<Profile>('profile');
}

export async function setProfile(profile: Profile): Promise<void> {
  await kvSet('profile', profile);
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const v = await kvGet<T>(`setting:${key}`);
  return v === null ? fallback : v;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await kvSet(`setting:${key}`, value);
}

export async function hasCompletedOnboarding(): Promise<boolean> {
  return getSetting<boolean>('onboarded', false);
}

export async function setOnboardingComplete(): Promise<void> {
  await setSetting('onboarded', true);
}

/** True when the entries table is empty (used to decide whether to seed). */
export async function isEmpty(): Promise<boolean> {
  const d = await getDb();
  const row = await d.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM entries');
  return (row?.n ?? 0) === 0;
}
