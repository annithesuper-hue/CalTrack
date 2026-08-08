import { apiUrl, ApiError, requestJson } from './api-client';
import type { AnalysisResult } from './types';

type RawAnalysis = Partial<AnalysisResult> & { error?: string; message?: string };

/**
 * Sends a captured meal photo (base64) to the Expo API route, which forwards
 * it to Gemini. Uses the shared request helper for timeout/retry handling.
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
  const data = await requestJson<RawAnalysis>(apiUrl('/api/analyze'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: base64, mimeType }),
    // Image analysis can take a while — give it a generous budget.
    timeoutMs: 45000,
    retries: 2,
    signal,
  });

  return {
    name: data.name || 'Meal',
    emoji: data.emoji || '🍽️',
    calories: Math.max(0, Math.round(data.calories ?? 0)),
    protein: Math.max(0, Math.round(data.protein ?? 0)),
    carbs: Math.max(0, Math.round(data.carbs ?? 0)),
    fat: Math.max(0, Math.round(data.fat ?? 0)),
    confidence: data.confidence ?? 'medium',
    items: Array.isArray(data.items) ? data.items : [],
  };
}

export { ApiError };
