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
 * Calls the Gemini API directly from the device instead of going through
 * /api/analyze. Used when EXPO_PUBLIC_GEMINI_API_KEY is set — necessary for
 * native builds that don't have a deployed server behind the Expo Router
 * API routes (fetch('/api/analyze') has no origin to resolve against there).
 *
 * Trade-off: the API key ships inside the client bundle and is visible to
 * anyone who inspects the app. Only use this path if you're comfortable
 * with that; otherwise deploy the server and set EXPO_PUBLIC_API_BASE_URL
 * instead (see .env.example).
 */
export async function analyzeMealPhotoDirect(
  base64: string,
  mimeType: string,
  apiKey: string,
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
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
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
