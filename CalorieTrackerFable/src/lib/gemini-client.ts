import { ApiError, requestJson } from './api-client';
import { GEMINI_MODELS, GEMINI_PROMPT, GEMINI_RESPONSE_SCHEMA } from './gemini-prompt';

type GeminiCandidateResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

type RawGeminiFood = {
  isFood?: boolean;
  name?: string;
  emoji?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  confidence?: 'low' | 'medium' | 'high';
  items?: Array<{ name: string; calories: number }>;
};

/**
 * Gemini API key used for direct on-device requests. Ships inside the
 * client bundle and is visible to anyone who inspects the app — replace
 * with your real key before building.
 */
const GEMINI_API_KEY = 'AQ.Ab8RN6J0ZAoAVGGYvBSu_rwi1JcpLPq7Ova3wH-QcYXSzzmC4w';

/**
 * Calls the Gemini API directly from the device using GEMINI_API_KEY above.
 * Native builds have no deployed server behind the Expo Router API routes,
 * so fetch('/api/analyze') has no origin to resolve against there — this is
 * the only path used now.
 */
export async function analyzeMealPhotoDirect(
  base64: string,
  mimeType: string,
  signal?: AbortSignal,
): Promise<RawGeminiFood> {
  const payload = {
    contents: [
      {
        parts: [{ text: GEMINI_PROMPT }, { inline_data: { mime_type: mimeType, data: base64 } }],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: GEMINI_RESPONSE_SCHEMA,
      temperature: 0.2,
    },
  };

  let lastError: unknown = new ApiError('server', 'Gemini analysis failed for all models.');

  for (const model of GEMINI_MODELS) {
    try {
      const data = await requestJson<GeminiCandidateResponse>(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
          body: JSON.stringify(payload),
          timeoutMs: 45000,
          retries: 1,
          signal,
        },
      );

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        lastError = new ApiError('server', `${model} returned no content`);
        continue;
      }

      const parsed = JSON.parse(text) as RawGeminiFood;
      if (!parsed.isFood) {
        throw new ApiError('invalid_request', 'No food detected in this photo.', 422, { error: 'no_food' });
      }
      return parsed;
    } catch (e) {
      // An invalid key or rate limit fails identically for every model —
      // no point trying the fallback model, surface it immediately.
      if (e instanceof ApiError && (e.kind === 'auth' || e.kind === 'rate_limited')) throw e;
      if (e instanceof ApiError && (e.body as { error?: string } | undefined)?.error === 'no_food') throw e;
      lastError = e;
    }
  }

  throw lastError instanceof Error ? lastError : new ApiError('server', 'Gemini analysis failed for all models.');
}
