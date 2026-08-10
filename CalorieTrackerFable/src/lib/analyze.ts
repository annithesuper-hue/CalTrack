import { ApiError } from './api-client';
import { analyzeMealPhotoDirect, type RawGeminiFood } from './gemini-client';
import type { AnalysisResult } from './types';

type RawAnalysis = RawGeminiFood & { error?: string; message?: string };

/**
 * Analyzes a captured meal photo (base64).
 *
 * Calls Gemini directly from the device using the hardcoded key in
 * gemini-client.ts — required for native builds, which have no server
 * origin for a relative fetch('/api/analyze') to resolve against.
 *
 * Throws ApiError. Callers can check `error.body?.error === 'no_food'` for
 * the "no food detected" case, and `friendlyErrorMessage(error, 'ai')` for a
 * user-facing message otherwise.
 */
export async function analyzeMealPhoto(
  base64: string,
  mimeType: string = 'image/jpeg',
  signal?: AbortSignal,
): Promise<AnalysisResult> {
  const data: RawAnalysis = await analyzeMealPhotoDirect(base64, mimeType, signal);

  return {
    name: data.name || 'Meal',
    emoji: data.emoji || '🍽️',
    calories: Math.max(0, Math.round(data.calories ?? 0)),
    protein: Math.max(0, Math.round(data.protein ?? 0)),
    carbs: Math.max(0, Math.round(data.carbs ?? 0)),
    fat: Math.max(0, Math.round(data.fat ?? 0)),
    confidence: data.confidence ?? 'medium',
    items: Array.isArray(data.items) ? data.items : [],
    estimatedGrams:
      typeof data.estimatedGrams === 'number' && data.estimatedGrams > 0 ? Math.round(data.estimatedGrams) : null,
    countable:
      data.isCountable && typeof data.estimatedCount === 'number' && data.estimatedCount > 0 && data.countUnitLabel
        ? { estimatedCount: Math.round(data.estimatedCount), unitLabel: data.countUnitLabel }
        : null,
  };
}

export { ApiError };
