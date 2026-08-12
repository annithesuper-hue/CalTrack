import { ApiError, requestJson } from './api-client';
import type { MacroSet } from './types';

/** USDA nutrient numbers we care about. See fdc.nal.usda.gov nutrient list. */
const NUTRIENT_ID = {
  ENERGY_KCAL: 1008,
  PROTEIN: 1003,
  FAT: 1004,
  CARBS: 1005,
  FIBER: 1079,
  SUGAR: 2000,
  SODIUM: 1093,
} as const;

export type UsdaExtras = { fiber: number; sugar: number; sodium: number };

export type UsdaNormalizedFood = {
  fdcId: number;
  name: string;
  brand: string | null;
  /** Size of one serving, if USDA reports it. */
  servingSize: number | null;
  servingSizeUnit: string | null;
  /** Human string like "1 bar (40g)", when available. */
  servingDescription: string | null;
  gtinUpc: string | null;
  /** Nutrition for exactly one serving (see servingDescription). */
  perServing: MacroSet & UsdaExtras;
  /** Nutrition per 1 gram — the basis used for gram/kg/ml quantity entry. */
  perGram: MacroSet & UsdaExtras;
  /** Whether this came from USDA's Branded set (packaged product) vs Foundation/SR Legacy (generic/raw ingredient). */
  isBranded: boolean;
};

function safeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function extractPer100g(foodNutrients: unknown): Record<number, number> {
  const map: Record<number, number> = {};
  if (!Array.isArray(foodNutrients)) return map;
  for (const raw of foodNutrients) {
    const n = raw as { nutrientId?: number; nutrient?: { id?: number }; value?: number; amount?: number };
    const id = n.nutrientId ?? n.nutrient?.id;
    const value = typeof n.value === 'number' ? n.value : n.amount;
    if (typeof id === 'number' && typeof value === 'number' && Number.isFinite(value)) {
      map[id] = value;
    }
  }
  return map;
}

type LabelNutrients = {
  calories?: { value?: number };
  protein?: { value?: number };
  carbohydrates?: { value?: number };
  fat?: { value?: number };
  fiber?: { value?: number };
  sugars?: { value?: number };
  sodium?: { value?: number };
};

/** Branded foods carry a `labelNutrients` object matching the printed Nutrition Facts panel — per serving, no scaling needed. */
function fromLabelNutrients(label: unknown): (MacroSet & UsdaExtras) | null {
  const l = label as LabelNutrients | null | undefined;
  if (!l || typeof l.calories?.value !== 'number') return null;
  return {
    calories: safeNumber(l.calories?.value),
    protein: safeNumber(l.protein?.value),
    carbs: safeNumber(l.carbohydrates?.value),
    fat: safeNumber(l.fat?.value),
    fiber: safeNumber(l.fiber?.value),
    sugar: safeNumber(l.sugars?.value),
    sodium: safeNumber(l.sodium?.value),
  };
}

/** Fallback: USDA's general foodNutrients array is per-100g; scale to the serving size. */
function fromPer100g(per100g: Record<number, number>, servingSize: number | null): MacroSet & UsdaExtras {
  const grams = servingSize && servingSize > 0 ? servingSize : 100;
  const scale = grams / 100;
  const at = (id: number) => (per100g[id] ?? 0) * scale;
  return {
    calories: at(NUTRIENT_ID.ENERGY_KCAL),
    protein: at(NUTRIENT_ID.PROTEIN),
    carbs: at(NUTRIENT_ID.CARBS),
    fat: at(NUTRIENT_ID.FAT),
    fiber: at(NUTRIENT_ID.FIBER),
    sugar: at(NUTRIENT_ID.SUGAR),
    sodium: at(NUTRIENT_ID.SODIUM),
  };
}

export function normalizeUsdaFood(raw: unknown): UsdaNormalizedFood {
  const f = raw as {
    fdcId?: number;
    description?: string;
    brandOwner?: string;
    brandName?: string;
    servingSize?: number;
    servingSizeUnit?: string;
    householdServingFullText?: string;
    gtinUpc?: string;
    labelNutrients?: unknown;
    foodNutrients?: unknown;
    dataType?: string;
  };

  const servingSize = typeof f.servingSize === 'number' ? f.servingSize : null;
  const servingSizeUnit = f.servingSizeUnit ?? null;
  const per100g = extractPer100g(f.foodNutrients);

  const perServingRaw = fromLabelNutrients(f.labelNutrients) ?? fromPer100g(per100g, servingSize);
  const perServing = {
    calories: Math.max(0, perServingRaw.calories),
    protein: Math.max(0, perServingRaw.protein),
    carbs: Math.max(0, perServingRaw.carbs),
    fat: Math.max(0, perServingRaw.fat),
    fiber: Math.max(0, perServingRaw.fiber),
    sugar: Math.max(0, perServingRaw.sugar),
    sodium: Math.max(0, perServingRaw.sodium),
  };

  // Per-gram basis for the gram/kg/ml quantity picker. Prefer USDA's
  // per-100g array directly (most accurate); fall back to deriving it from
  // the per-serving figures when only labelNutrients (branded, per-serving
  // only) is available.
  const hasPer100g = Object.keys(per100g).length > 0;
  const gramsForFallback = servingSize && servingSize > 0 ? servingSize : 100;
  const perGram = hasPer100g
    ? {
        calories: Math.max(0, (per100g[NUTRIENT_ID.ENERGY_KCAL] ?? 0) / 100),
        protein: Math.max(0, (per100g[NUTRIENT_ID.PROTEIN] ?? 0) / 100),
        carbs: Math.max(0, (per100g[NUTRIENT_ID.CARBS] ?? 0) / 100),
        fat: Math.max(0, (per100g[NUTRIENT_ID.FAT] ?? 0) / 100),
        fiber: Math.max(0, (per100g[NUTRIENT_ID.FIBER] ?? 0) / 100),
        sugar: Math.max(0, (per100g[NUTRIENT_ID.SUGAR] ?? 0) / 100),
        sodium: Math.max(0, (per100g[NUTRIENT_ID.SODIUM] ?? 0) / 100),
      }
    : {
        calories: perServing.calories / gramsForFallback,
        protein: perServing.protein / gramsForFallback,
        carbs: perServing.carbs / gramsForFallback,
        fat: perServing.fat / gramsForFallback,
        fiber: perServing.fiber / gramsForFallback,
        sugar: perServing.sugar / gramsForFallback,
        sodium: perServing.sodium / gramsForFallback,
      };

  return {
    fdcId: typeof f.fdcId === 'number' ? f.fdcId : 0,
    name: f.description?.trim() || 'Unknown food',
    brand: f.brandOwner?.trim() || f.brandName?.trim() || null,
    servingSize,
    servingSizeUnit,
    servingDescription:
      f.householdServingFullText?.trim() ||
      (servingSize ? `${servingSize}${servingSizeUnit ?? 'g'}` : null),
    gtinUpc: f.gtinUpc ?? null,
    perServing,
    perGram,
    isBranded: f.dataType === 'Branded',
  };
}

const USDA_SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';

/**
 * USDA FoodData Central API key(s) used for direct on-device requests. Read
 * from env vars set in Codemagic — never hardcode literal keys here (see
 * GEMINI_API_KEY in gemini-client.ts for why).
 *
 * Supports up to two keys (EXPO_PUBLIC_USDA_API_KEY and
 * EXPO_PUBLIC_USDA_API_KEY_2). A random one is picked per request to spread
 * load across both; if that one fails with auth/rate-limit, the other is
 * tried automatically before giving up.
 */
const USDA_API_KEYS = [process.env.EXPO_PUBLIC_USDA_API_KEY, process.env.EXPO_PUBLIC_USDA_API_KEY_2].filter(
  (k): k is string => typeof k === 'string' && k.length > 0,
);

if (USDA_API_KEYS.length === 0 && __DEV__) {
  console.warn('[usda] No USDA API key is set (EXPO_PUBLIC_USDA_API_KEY / _2) — requests will fail with 401.');
}

/** Returns the key pool in random order, so repeated calls spread load and retry on a different key after a failure. */
function shuffledUsdaKeys(): string[] {
  const keys = [...USDA_API_KEYS];
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [keys[i], keys[j]] = [keys[j], keys[i]];
  }
  return keys;
}

/** Strips leading zeros so "0049000028911" and "49000028911" compare equal. */
function normalizeCode(code: string): string {
  return code.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
}

/**
 * Runs a USDA /foods/search request, trying each available API key in
 * random order. Moves on to the next key only for auth/rate-limit errors —
 * any other error (offline, timeout, server, not_found) is thrown
 * immediately since a different key wouldn't fix it.
 */
async function usdaSearchRequest(params: Record<string, string>, signal?: AbortSignal): Promise<{ foods?: unknown[] }> {
  const keys = shuffledUsdaKeys();
  if (keys.length === 0) {
    throw new ApiError('auth', 'No USDA API key configured.', 401);
  }

  let lastError: unknown;
  for (const key of keys) {
    const url = new URL(USDA_SEARCH_URL);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set('api_key', key);

    try {
      return await requestJson<{ foods?: unknown[] }>(url.toString(), {
        method: 'GET',
        timeoutMs: 20000,
        retries: 1,
        signal,
      });
    } catch (e) {
      lastError = e;
      const shouldTryNextKey = e instanceof ApiError && (e.kind === 'auth' || e.kind === 'rate_limited');
      if (!shouldTryNextKey) throw e;
    }
  }
  throw lastError instanceof Error ? lastError : new ApiError('auth', 'All USDA API keys failed.', 401);
}

/**
 * Looks up a product by UPC/EAN barcode directly against USDA FoodData
 * Central. Native builds have no deployed server behind /api/usda-lookup,
 * so a relative fetch has no origin to resolve against there — this is
 * the only path used now.
 *
 * Throws ApiError; a 404/not_found means "not found" (not a network
 * problem) — callers should show the "Food not found" state rather than a
 * generic error.
 */
export async function lookupBarcode(barcode: string, signal?: AbortSignal): Promise<UsdaNormalizedFood> {
  const data = await usdaSearchRequest(
    { query: barcode, dataType: 'Branded', pageSize: '10' },
    signal,
  );

  const target = normalizeCode(barcode);
  const match = (data.foods ?? []).find((food) => {
    const gtin = (food as { gtinUpc?: string }).gtinUpc;
    return typeof gtin === 'string' && normalizeCode(gtin) === target;
  });

  if (!match) {
    throw new ApiError('not_found', 'No matching product found in USDA FoodData Central.');
  }
  return normalizeUsdaFood(match);
}

/**
 * Text search for foods by name (e.g. "soya chunks"), for the manual
 * food-search screen. Searches Branded, Foundation, and SR Legacy data at
 * once for the broadest results, same as the barcode lookup's key-rotation
 * and error handling.
 */
export async function searchFoods(query: string, signal?: AbortSignal): Promise<UsdaNormalizedFood[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const data = await usdaSearchRequest(
    {
      query: trimmed,
      dataType: 'Branded,Foundation,SR Legacy',
      pageSize: '25',
    },
    signal,
  );

  return (data.foods ?? [])
    .map((food) => normalizeUsdaFood(food))
    // USDA occasionally returns entries with no usable calorie data (e.g.
    // incomplete branded submissions) — these are the "calories hi nahi ara"
    // results; drop them rather than showing a food with 0 kcal.
    .filter((food) => food.perServing.calories > 0 || food.perGram.calories > 0);
}

// Note: there used to be a `usdaFoodToAnalysis` helper here that duplicated
// the servings→AnalysisResult math already in `food-search.ts`'s
// `foodResultToAnalysis`. It was never called from anywhere (the app always
// goes through the unified food-search layer), so it was removed rather
// than kept as a second, drift-prone copy of the same calculation.
