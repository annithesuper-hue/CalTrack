import { ApiError, requestJson } from './api-client';
import { GEMINI_MODELS, GEMINI_PROMPT, GEMINI_RESPONSE_SCHEMA } from './gemini-prompt';

type GeminiCandidateResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

export type RawGeminiFood = {
  isFood?: boolean;
  name?: string;
  emoji?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  confidence?: 'low' | 'medium' | 'high';
  estimatedGrams?: number;
  isCountable?: boolean;
  estimatedCount?: number;
  countUnitLabel?: string;
  items?: Array<{ name: string; calories: number }>;
};

/**
 * Gemini API key(s) used for direct on-device requests. Read from env vars
 * set in Codemagic's caltrack-secrets group — never hardcode literal keys
 * here.
 *
 * Supports up to two keys (EXPO_PUBLIC_GEMINI_API_KEY and
 * EXPO_PUBLIC_GEMINI_API_KEY_2). A random one is picked per request to
 * spread load across both; if that one fails with auth/rate-limit, the
 * other is tried automatically before giving up.
 */
const GEMINI_API_KEYS = [process.env.EXPO_PUBLIC_GEMINI_API_KEY, process.env.EXPO_PUBLIC_GEMINI_API_KEY_2].filter(
  (k): k is string => typeof k === 'string' && k.length > 0,
);

if (GEMINI_API_KEYS.length === 0 && __DEV__) {
  console.warn('[gemini-client] No Gemini API key is set (EXPO_PUBLIC_GEMINI_API_KEY / _2) — requests will fail with 401.');
}

/** Returns the key pool in random order, so repeated calls spread load and retry on a different key after a failure. */
function shuffledGeminiKeys(): string[] {
  const keys = [...GEMINI_API_KEYS];
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [keys[i], keys[j]] = [keys[j], keys[i]];
  }
  return keys;
}

/**
 * Calls the Gemini API directly from the device, trying each available key
 * in random order and falling back through GEMINI_MODELS for each. Native
 * builds have no deployed server behind the Expo Router API routes, so
 * fetch('/api/analyze') has no origin to resolve against there — this is
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

  const keys = shuffledGeminiKeys();
  if (keys.length === 0) {
    throw new ApiError('auth', 'No Gemini API key configured.', 401);
  }

  let lastError: unknown = new ApiError('server', 'Gemini analysis failed for all models.');

  for (const key of keys) {
    for (const model of GEMINI_MODELS) {
      try {
        const data = await requestJson<GeminiCandidateResponse>(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
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
        // A real "no food in photo" result — surface immediately, no point
        // retrying with another model or key.
        if (e instanceof ApiError && (e.body as { error?: string } | undefined)?.error === 'no_food') throw e;

        // Auth/rate-limit fails identically for every model on this key —
        // stop trying models and move straight to the next key.
        if (e instanceof ApiError && (e.kind === 'auth' || e.kind === 'rate_limited')) {
          lastError = e;
          break;
        }

        lastError = e;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new ApiError('server', 'Gemini analysis failed for all models.');
}
