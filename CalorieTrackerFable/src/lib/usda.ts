import { ApiError, requestJson } from './api-client';
import type { AnalysisResult, MacroSet } from './types';

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
  };

  const servingSize = typeof f.servingSize === 'number' ? f.servingSize : null;
  const servingSizeUnit = f.servingSizeUnit ?? null;

  const perServing =
    fromLabelNutrients(f.labelNutrients) ?? fromPer100g(extractPer100g(f.foodNutrients), servingSize);

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
    perServing: {
      calories: Math.max(0, perServing.calories),
      protein: Math.max(0, perServing.protein),
      carbs: Math.max(0, perServing.carbs),
      fat: Math.max(0, perServing.fat),
      fiber: Math.max(0, perServing.fiber),
      sugar: Math.max(0, perServing.sugar),
      sodium: Math.max(0, perServing.sodium),
    },
  };
}

const USDA_SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';

/**
 * USDA FoodData Central API key used for direct on-device requests. Ships
 * inside the client bundle and is visible to anyone who inspects the app —
 * replace with your real key before building.
 */
const USDA_API_KEY = 'wAbTg2Ej9x14mY7ccdZ87dldf3QglrqZ3GSBzmWr';

/** Strips leading zeros so "0049000028911" and "49000028911" compare equal. */
function normalizeCode(code: string): string {
  return code.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
}

/**
 * Looks up a product by UPC/EAN barcode directly against USDA FoodData
 * Central using USDA_API_KEY above. Native builds have no deployed server
 * behind /api/usda-lookup, so a relative fetch has no origin to resolve
 * against there — this is the only path used now.
 *
 * Throws ApiError; a 404/not_found means "not found" (not a network
 * problem) — callers should show the "Food not found" state rather than a
 * generic error.
 */
export async function lookupBarcode(barcode: string, signal?: AbortSignal): Promise<UsdaNormalizedFood> {
  const url = new URL(USDA_SEARCH_URL);
  url.searchParams.set('api_key', USDA_API_KEY);
  url.searchParams.set('query', barcode);
  url.searchParams.set('dataType', 'Branded');
  url.searchParams.set('pageSize', '10');

  const data = await requestJson<{ foods?: unknown[] }>(url.toString(), {
    method: 'GET',
    timeoutMs: 20000,
    retries: 1,
    signal,
  });

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
 * Converts a normalized USDA food + a quantity (number of servings) into
 * the same AnalysisResult shape the AI photo flow produces, so it can be
 * logged through the existing `logMeal` pipeline without any special-casing.
 */
export function usdaFoodToAnalysis(food: UsdaNormalizedFood, servings: number): AnalysisResult {
  const s = Number.isFinite(servings) && servings > 0 ? servings : 1;
  return {
    name: food.brand ? `${food.name} (${food.brand})` : food.name,
    emoji: '📦',
    calories: Math.max(0, Math.round(food.perServing.calories * s)),
    protein: Math.max(0, Math.round(food.perServing.protein * s)),
    carbs: Math.max(0, Math.round(food.perServing.carbs * s)),
    fat: Math.max(0, Math.round(food.perServing.fat * s)),
    confidence: 'high',
    items: [],
  };
}
