import { apiUrl, ApiError, requestJson } from './api-client';
import { analyzeMealPhotoDirect, type RawGeminiFood } from './gemini-client';
import type { AnalysisResult } from './types';

type RawAnalysis = RawGeminiFood & { error?: string; message?: string };

function toAnalysisResult(data: RawAnalysis): AnalysisResult {
  return {
    name: data.name || 'Meal',
    emoji: data.emoji || '🍽️',
    calories: Math.max(0, Math.round(data.calories ?? 0)),
    protein: Math.max(0, Math.round(data.protein ?? 0)),
    carbs: Math.max(0, Math.round(data.carbs ?? 0)),
    fat: Math.max(0, Math.round(data.fat ?? 0)),
    fiber: Math.max(0, Math.round(data.fiber ?? 0)),
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

/**
 * Analyzes a captured meal photo (base64).
 *
 * Always prefers the server-side `/api/analyze` route (`src/app/api/analyze+api.ts`),
 * which keeps the Gemini API key server-only (`GEMINI_API_KEY`, no
 * `EXPO_PUBLIC_` prefix — never shipped to the client). That route only
 * resolves on native when `EXPO_PUBLIC_API_BASE_URL` points at a deployed
 * server, per `resolveApiBaseUrl()` in `api-client.ts`.
 *
 * If no base URL is configured, falls back to calling Gemini directly from
 * the device with `EXPO_PUBLIC_GEMINI_API_KEY` — that key IS embedded in
 * the client bundle and extractable from the compiled app, so this path is
 * a stopgap for local/dev builds, not something to ship broadly. Deploying
 * the API route and setting `EXPO_PUBLIC_API_BASE_URL` removes the need
 * for a client-side key entirely.
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
  const serverUrl = apiUrl('/api/analyze');
  // `apiUrl` returns a bare relative path with no configured base on native
  // (no implicit origin there); on web the relative path is always valid
  // against the current origin. Only native without a configured base URL
  // needs the direct-to-Gemini fallback.
  const canUseServerRoute = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || typeof window !== 'undefined';

  if (canUseServerRoute) {
    try {
      const data = await requestJson<RawAnalysis>(serverUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
        timeoutMs: 45000,
        retries: 1,
        signal,
      });
      if (data.error === 'no_food') {
        throw new ApiError('invalid_request', 'No food detected in this photo.', 422, { error: 'no_food' });
      }
      return toAnalysisResult(data);
    } catch (e) {
      if (e instanceof ApiError && (e.body as { error?: string } | undefined)?.error === 'no_food') throw e;
      if (__DEV__) console.warn('[analyze] server route failed, falling back to direct Gemini call', e);
    }
  }

  const data: RawAnalysis = await analyzeMealPhotoDirect(base64, mimeType, signal);
  return toAnalysisResult(data);
}

export { ApiError };
