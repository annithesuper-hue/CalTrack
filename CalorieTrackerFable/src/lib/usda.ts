import { ApiError, apiFetch } from './api-client';
import type { FoodItem } from './types';

const __DEV__ = process.env.NODE_ENV !== 'production';

const BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

/** USDA FoodData Central nutrient IDs — matched by number, never by array position. */
const NUTRIENT_IDS = {
  ENERGY_KCAL: [1008, 208, 2048],
  PROTEIN_G: [1003, 203],
  CARBOHYDRATE_G: [1005, 205],
  FAT_G: [1004, 204],
  FIBER_G: [1079, 291],
  SUGAR_G: [2000, 269],
  SODIUM_MG: [1093, 307],
} as const;

type UsdaNutrient = {
  nutrientId: number;
  name: string;
  unitName: string;
  amount: number;
};

type UsdaFood = {
  fdcId: number;
  description?: string;
  brandOwner?: string;
  brandName?: string;
  dataType?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodMeasures?: Array<{
    label?: string;
    gramWeight?: number;
    portionDescription?: string;
  }>;
  foodNutrients?: Array<{
    nutrientId?: number;
    name?: string;
    unitName?: string;
    amount?: number;
    value?: number;
  }>;
};

type UsdaSearchResponse = {
  foods: UsdaFood[];
  totalHits?: number;
};

type UsdaDetailResponse = UsdaFood;

function getApiKey(): string {
  const key = process.env.EXPO_PUBLIC_USDA_API_KEY;
  if (!key) {
    throw new ApiError('unauthorized', 'USDA API key is not configured.');
  }
  return key;
}

/** Safely extract a nutrient amount from the USDA nutrient array by ID. */
function extractNutrient(
  food: UsdaFood,
  ids: readonly number[],
  fallback = 0,
): number {
  const nutrients = food.foodNutrients ?? [];
  for (const id of ids) {
    const match = nutrients.find((n) => n.nutrientId === id);
    if (match) {
      const val = match.amount ?? match.value;
      if (typeof val === 'number' && Number.isFinite(val)) return val;
    }
  }
  return fallback;
}

/** Normalize any USDA food type into the app's FoodItem model. */
export function normalizeUsdaFood(food: UsdaFood): FoodItem {
  const calories = extractNutrient(food, NUTRIENT_IDS.ENERGY_KCAL);
  const protein = extractNutrient(food, NUTRIENT_IDS.PROTEIN_G);
  const carbs = extractNutrient(food, NUTRIENT_IDS.CARBOHYDRATE_G);
  const fat = extractNutrient(food, NUTRIENT_IDS.FAT_G);
  const fiber = extractNutrient(food, NUTRIENT_IDS.FIBER_G);
  const sugar = extractNutrient(food, NUTRIENT_IDS.SUGAR_G);
  const sodium = extractNutrient(food, NUTRIENT_IDS.SODIUM_MG);

  const servingSize = food.servingSize
    ? `${food.servingSize} ${food.servingSizeUnit ?? 'g'}`
    : '1 serving';

  const brand = food.brandOwner || food.brandName || null;
  const name = food.description || 'Unknown food';

  return {
    name,
    brand,
    emoji: '🍽️',
    servingSize,
    servings: 1,
    source: 'usda',
    calories: Math.max(0, Math.round(calories)),
    protein: Math.max(0, Math.round(protein)),
    carbs: Math.max(0, Math.round(carbs)),
    fat: Math.max(0, Math.round(fat)),
    fiber: Math.max(0, Math.round(fiber)),
    sugar: Math.max(0, Math.round(sugar)),
    sodium: Math.max(0, Math.round(sodium)),
  };
}

/**
 * Search USDA FoodData Central by barcode (UPC/GTIN).
 * Returns null if no match found (distinct from a network error).
 */
export async function lookupBarcode(barcode: string): Promise<FoodItem | null> {
  const apiKey = getApiKey();
  const cleaned = barcode.replace(/[^0-9]/g, '');

  if (__DEV__) console.log(`[usda] Looking up barcode: ${cleaned}`);

  try {
    const data = await apiFetch<UsdaSearchResponse>(
      `${BASE_URL}/foods/search?api_key=${apiKey}`,
      {
        method: 'POST',
        body: JSON.stringify({
          query: cleaned,
          dataType: ['Branded'],
          pageSize: 5,
        }),
        timeoutMs: 20000,
        retries: 1,
      },
    );

    const foods = data.foods ?? [];
    if (foods.length === 0) {
      if (__DEV__) console.log('[usda] No barcode match found');
      return null;
    }

    // Find the best match — prefer exact UPC/GTIN match
    let best: UsdaFood | undefined;
    for (const f of foods) {
      const desc = (f.description || '').toLowerCase();
      if (desc.includes(cleaned) || desc.includes(barcode.toLowerCase())) {
        best = f;
        break;
      }
    }
    if (!best) best = foods[0];

    return normalizeUsdaFood(best);
  } catch (e) {
    if (e instanceof ApiError && e.type === 'not_found') {
      return null;
    }
    throw e;
  }
}

/**
 * Search USDA FoodData Central by food name (for future use / manual search).
 */
export async function searchFoodByName(query: string): Promise<FoodItem[]> {
  const apiKey = getApiKey();

  const data = await apiFetch<UsdaSearchResponse>(
    `${BASE_URL}/foods/search?api_key=${apiKey}`,
    {
      method: 'POST',
      body: JSON.stringify({
        query,
        dataType: ['Branded', 'Foundation', 'SR Legacy'],
        pageSize: 10,
      }),
      timeoutMs: 20000,
      retries: 1,
    },
  );

  const foods = data.foods ?? [];
  return foods.map(normalizeUsdaFood);
}
