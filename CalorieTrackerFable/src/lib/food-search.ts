import { ApiError } from './api-client';
import { LOCAL_FOODS, searchLocalFoods, type LocalFood } from './local-foods';
import { lookupBarcodeOFF, searchFoodsOFF, type OffFood } from './openfoodfacts';
import type { AnalysisResult, MacroSet } from './types';
import { lookupBarcode as lookupBarcodeUSDA, searchFoods as searchFoodsUSDA, type UsdaNormalizedFood } from './usda';

/**
 * Unified food-search layer. Combines three sources so search results are
 * useful for both packaged/branded products and plain generic ingredients:
 *
 *  - `local`  — a small built-in database of common non-branded foods
 *               (see local-foods.ts), instant and always available offline.
 *  - `usda`   — USDA FoodData Central (Branded + Foundation + SR Legacy).
 *  - `off`    — Open Food Facts, a global crowd-sourced product database
 *               with much better non-US (incl. Indian) brand coverage than
 *               USDA, which is why it's also used first for barcode scans.
 *
 * Every result is normalized to a per-gram basis so the UI can support
 * gram/kg/ml quantity entry, not just "servings".
 */

export type FoodSource = 'local' | 'usda' | 'off';

export type FoodExtras = { fiber: number; sugar: number; sodium: number };

export type FoodResult = {
  id: string;
  source: FoodSource;
  /** true for a plain/generic ingredient (local db, or USDA Foundation/SR Legacy), false for a packaged branded product. */
  isGeneric: boolean;
  name: string;
  brand: string | null;
  perGram: MacroSet & FoodExtras;
  /** A sensible default quantity to prefill (grams, or ml for liquids). */
  defaultQuantity: number;
  unit: 'g' | 'ml';
  servingDescription: string | null;
};

function fromLocal(f: LocalFood): FoodResult {
  return {
    id: f.id,
    source: 'local',
    isGeneric: true,
    name: f.name,
    brand: null,
    perGram: {
      calories: f.per100g.calories / 100,
      protein: f.per100g.protein / 100,
      carbs: f.per100g.carbs / 100,
      fat: f.per100g.fat / 100,
      fiber: f.per100g.fiber / 100,
      sugar: f.per100g.sugar / 100,
      sodium: f.per100g.sodium / 100,
    },
    defaultQuantity: f.defaultGrams,
    unit: f.unit,
    servingDescription: null,
  };
}

function fromUsda(f: UsdaNormalizedFood): FoodResult {
  return {
    id: `usda:${f.fdcId}`,
    source: 'usda',
    isGeneric: !f.isBranded,
    name: f.name,
    brand: f.brand,
    perGram: f.perGram,
    defaultQuantity: f.servingSize && f.servingSize > 0 ? Math.round(f.servingSize) : 100,
    unit: 'g',
    servingDescription: f.servingDescription,
  };
}

function fromOff(f: OffFood): FoodResult {
  return {
    id: f.id,
    source: 'off',
    isGeneric: false,
    name: f.name,
    brand: f.brand,
    perGram: {
      calories: f.per100g.calories / 100,
      protein: f.per100g.protein / 100,
      carbs: f.per100g.carbs / 100,
      fat: f.per100g.fat / 100,
      fiber: f.per100g.fiber / 100,
      sugar: f.per100g.sugar / 100,
      sodium: f.per100g.sodium / 100,
    },
    defaultQuantity: f.servingGrams && f.servingGrams > 0 ? Math.round(f.servingGrams) : 100,
    unit: 'g',
    servingDescription: f.servingDescription,
  };
}

function dedupeKey(r: FoodResult): string {
  return `${r.name.toLowerCase().trim()}|${(r.brand ?? '').toLowerCase().trim()}`;
}

/**
 * Interleaves sources rather than concatenating them, so results read as a
 * healthy mix (generic + branded, local + online) instead of one source
 * dominating the top of the list.
 */
function interleave(groups: FoodResult[][]): FoodResult[] {
  const out: FoodResult[] = [];
  const seen = new Set<string>();
  let more = true;
  let i = 0;
  while (more) {
    more = false;
    for (const g of groups) {
      if (i < g.length) {
        more = true;
        const item = g[i];
        const key = dedupeKey(item);
        if (!seen.has(key)) {
          seen.add(key);
          out.push(item);
        }
      }
    }
    i++;
  }
  return out;
}

/**
 * Searches local + USDA + Open Food Facts in parallel and merges them.
 * Local results always resolve instantly; USDA/OFF are best-effort — if one
 * fails (offline, rate limited, etc.) the other sources still come back
 * rather than failing the whole search.
 */
export async function searchAllFoods(query: string, signal?: AbortSignal): Promise<FoodResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const localResults = searchLocalFoods(trimmed).map(fromLocal);

  const [usdaSettled, offSettled] = await Promise.allSettled([
    searchFoodsUSDA(trimmed, signal),
    searchFoodsOFF(trimmed, signal),
  ]);

  const usdaResults = usdaSettled.status === 'fulfilled' ? usdaSettled.value.map(fromUsda) : [];
  const offResults = offSettled.status === 'fulfilled' ? offSettled.value.map(fromOff) : [];

  // If every online source failed outright (e.g. fully offline) but we have
  // no local matches either, surface the USDA error so the screen can show
  // a proper retry state instead of a silent empty list.
  if (usdaSettled.status === 'rejected' && offResults.length === 0 && localResults.length === 0) {
    throw usdaSettled.reason;
  }

  // Generic (non-branded) results first — local db, then USDA
  // Foundation/SR Legacy — followed by branded results from USDA and OFF,
  // interleaved so no single source dominates the list.
  const generic = interleave([localResults, usdaResults.filter((r) => r.isGeneric)]);
  const branded = interleave([usdaResults.filter((r) => !r.isGeneric), offResults]);

  return interleave([generic, branded]);
}

/**
 * Barcode lookup: tries Open Food Facts first (far better global/Indian
 * product coverage than USDA, which is almost entirely US-market branded
 * foods — the main reason scans were coming back "not found"), then falls
 * back to USDA FoodData Central.
 */
export async function lookupBarcodeAny(barcode: string, signal?: AbortSignal): Promise<FoodResult> {
  try {
    const off = await lookupBarcodeOFF(barcode, signal);
    return fromOff(off);
  } catch (offError) {
    if (signal?.aborted) throw offError;
    try {
      const usda = await lookupBarcodeUSDA(barcode, signal);
      return fromUsda(usda);
    } catch (usdaError) {
      if (signal?.aborted) throw usdaError;
      // Prefer a "not_found" verdict only if at least one source clearly
      // said "not found" rather than errored for another reason (offline,
      // timeout) — otherwise surface the more informative error.
      const offNotFound = offError instanceof ApiError && offError.kind === 'not_found';
      const usdaNotFound = usdaError instanceof ApiError && usdaError.kind === 'not_found';
      if (offNotFound && usdaNotFound) throw usdaError;
      throw offNotFound ? usdaError : offError;
    }
  }
}

/** Converts a FoodResult + quantity (in the result's unit, e.g. grams) into a loggable AnalysisResult. */
export function foodResultToAnalysis(food: FoodResult, quantity: number): AnalysisResult {
  const q = Number.isFinite(quantity) && quantity > 0 ? quantity : food.defaultQuantity;
  return {
    name: food.brand ? `${food.name} (${food.brand})` : food.name,
    emoji: food.isGeneric ? '🥗' : '📦',
    calories: Math.max(0, Math.round(food.perGram.calories * q)),
    protein: Math.max(0, Math.round(food.perGram.protein * q)),
    carbs: Math.max(0, Math.round(food.perGram.carbs * q)),
    fat: Math.max(0, Math.round(food.perGram.fat * q)),
    confidence: 'high',
    items: [],
  };
}

export { LOCAL_FOODS };
