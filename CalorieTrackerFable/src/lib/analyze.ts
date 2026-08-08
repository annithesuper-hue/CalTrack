import { apiUrl, ApiError, requestJson } from './api-client';
import { analyzeMealPhotoDirect } from './gemini-client';
import type { AnalysisResult } from './types';

type RawAnalysis = Partial<AnalysisResult> & { error?: string; message?: string };

/**
 * Analyzes a captured meal photo (base64).
 *
 * If EXPO_PUBLIC_GEMINI_API_KEY is set, calls Gemini directly from the
 * device — required for native builds that don't have a server deployed
 * behind the /api/analyze route (a relative fetch has no origin to resolve
 * against there). Otherwise falls back to the /api/analyze server route,
 * which keeps GEMINI_API_KEY off the client — use that path if you deploy
 * a server and set EXPO_PUBLIC_API_BASE_URL. See .env.example.
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
  const clientKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

  const data: RawAnalysis = clientKey
    ? await analyzeMealPhotoDirect(base64, mimeType, clientKey, signal)
    : await requestJson<RawAnalysis>(apiUrl('/api/analyze'), {
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
