import { ApiError, requestJson } from './api-client';
import type { MacroSet } from './types';

/**
 * Open Food Facts — a free, no-API-key, crowd-sourced global product
 * database. USDA FoodData Central's "Branded" data is almost entirely
 * US-market products, so barcodes on Indian (or most non-US) packaged
 * foods simply aren't in it — that's the main reason barcode scanning
 * looked "broken": most scans just returned not_found. OFF has much
 * broader real-world coverage (including Indian brands), so it's tried
 * first for both barcode lookup and text search, with USDA as a fallback.
 */

export type OffExtras = { fiber: number; sugar: number; sodium: number };

export type OffFood = {
  id: string;
  name: string;
  brand: string | null;
  /** Nutrition per 100g/100ml, as reported on the pack. */
  per100g: MacroSet & OffExtras;
  servingGrams: number | null;
  servingDescription: string | null;
  barcode: string | null;
};

function safeNum(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

type OffNutriments = {
  ['energy-kcal_100g']?: number;
  ['energy-kcal_serving']?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
  fiber_100g?: number;
  sugars_100g?: number;
  sodium_100g?: number; // grams
};

type OffProduct = {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  generic_name?: string;
  brands?: string;
  nutriments?: OffNutriments;
  serving_size?: string;
  serving_quantity?: number | string;
  quantity?: string;
};

function normalizeOffProduct(p: OffProduct): OffFood | null {
  const n = p.nutriments;
  const kcal100 = n?.['energy-kcal_100g'];
  if (typeof kcal100 !== 'number' || !Number.isFinite(kcal100)) return null;

  const name = (p.product_name_en || p.product_name || p.generic_name || '').trim();
  if (!name) return null;

  const servingQty =
    typeof p.serving_quantity === 'number'
      ? p.serving_quantity
      : typeof p.serving_quantity === 'string'
        ? parseFloat(p.serving_quantity)
        : null;

  return {
    id: p.code ? `off:${p.code}` : `off:${name}`,
    name,
    brand: p.brands?.split(',')[0]?.trim() || null,
    per100g: {
      calories: Math.max(0, safeNum(kcal100)),
      protein: Math.max(0, safeNum(n?.proteins_100g)),
      carbs: Math.max(0, safeNum(n?.carbohydrates_100g)),
      fat: Math.max(0, safeNum(n?.fat_100g)),
      fiber: Math.max(0, safeNum(n?.fiber_100g)),
      sugar: Math.max(0, safeNum(n?.sugars_100g)),
      sodium: Math.max(0, safeNum(n?.sodium_100g) * 1000), // g -> mg
    },
    servingGrams: servingQty && servingQty > 0 ? servingQty : null,
    servingDescription: p.serving_size?.trim() || p.quantity?.trim() || null,
    barcode: p.code ?? null,
  };
}

const OFF_FIELDS =
  'code,product_name,product_name_en,generic_name,brands,nutriments,serving_size,serving_quantity,quantity';

/** Looks up a product by barcode. Throws ApiError('not_found', ...) if OFF has no usable nutrition for it. */
export async function lookupBarcodeOFF(barcode: string, signal?: AbortSignal): Promise<OffFood> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${OFF_FIELDS}`;
  const data = await requestJson<{ status?: number; product?: OffProduct }>(url, {
    method: 'GET',
    timeoutMs: 12000,
    retries: 1,
    signal,
  });

  if (data.status !== 1 || !data.product) {
    throw new ApiError('not_found', 'No matching product found in Open Food Facts.');
  }
  const normalized = normalizeOffProduct(data.product);
  if (!normalized) {
    throw new ApiError('not_found', 'Product found but has no usable nutrition data.');
  }
  return normalized;
}

/** Text search against OFF's public search endpoint, for merging into the manual food-search screen. */
export async function searchFoodsOFF(query: string, signal?: AbortSignal): Promise<OffFood[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url =
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(trimmed)}` +
    `&search_simple=1&action=process&json=1&page_size=20&fields=${OFF_FIELDS}`;

  try {
    const data = await requestJson<{ products?: OffProduct[] }>(url, {
      method: 'GET',
      timeoutMs: 12000,
      retries: 1,
      signal,
    });
    return (data.products ?? [])
      .map(normalizeOffProduct)
      .filter((f): f is OffFood => f !== null);
  } catch {
    // OFF search is a "nice to have" alongside USDA + local results — if it
    // fails or times out, just contribute nothing rather than blowing up
    // the whole search.
    return [];
  }
}
