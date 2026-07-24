import type { FoodEstimate } from '@/lib/types';

/**
 * POST /api/analyze-food
 * Body: { imageBase64: string, mimeType?: string }
 * Proxies a meal photo to Gemini (structured output) and returns a FoodEstimate.
 * GEMINI_API_KEY is server-only (from .env, auto-loaded by Expo CLI).
 */

const MODEL = 'gemini-3.6-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const TIMEOUT_MS = 30_000;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024; // ~12MB of base64 payload

const PROMPT = `You are a nutrition analysis assistant. Look at this photo of a meal.

Identify the meal and estimate its nutrition with realistic restaurant-style portion sizes.

Return:
- name: a short, appetizing meal name (e.g. "Buttermilk pancakes with berries"), max ~6 words
- calories / protein / carbs / fat: estimated TOTALS for the whole plate (kcal and grams)
- items: a per-item breakdown of each distinct component visible on the plate, each with its own name and calories/protein/carbs/fat estimates. The item totals should roughly add up to the overall totals.

Be realistic, not optimistic: use typical restaurant/café portions. All numbers must be non-negative integers.`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    calories: { type: 'integer' },
    protein: { type: 'integer' },
    carbs: { type: 'integer' },
    fat: { type: 'integer' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          calories: { type: 'integer' },
          protein: { type: 'integer' },
          carbs: { type: 'integer' },
          fat: { type: 'integer' },
        },
        required: ['name', 'calories', 'protein', 'carbs', 'fat'],
      },
    },
  },
  required: ['name', 'calories', 'protein', 'carbs', 'fat', 'items'],
} as const;

function errorResponse(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: { 'Content-Type': 'text/plain' },
  });
}

function toNonNegativeInt(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

function sanitizeEstimate(raw: unknown): FoodEstimate | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.name !== 'string' || r.name.trim().length === 0) return null;

  const rawItems = Array.isArray(r.items) ? r.items : [];
  const items = rawItems
    .filter((it): it is Record<string, unknown> => typeof it === 'object' && it !== null)
    .filter((it) => typeof it.name === 'string' && it.name.trim().length > 0)
    .map((it) => ({
      name: String(it.name).trim(),
      calories: toNonNegativeInt(it.calories),
      protein: toNonNegativeInt(it.protein),
      carbs: toNonNegativeInt(it.carbs),
      fat: toNonNegativeInt(it.fat),
    }));

  return {
    name: r.name.trim(),
    calories: toNonNegativeInt(r.calories),
    protein: toNonNegativeInt(r.protein),
    carbs: toNonNegativeInt(r.carbs),
    fat: toNonNegativeInt(r.fat),
    items,
  };
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return errorResponse(500, 'Food analysis is not configured (missing API key).');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'Invalid JSON body.');
  }

  const { imageBase64, mimeType } = (body ?? {}) as {
    imageBase64?: unknown;
    mimeType?: unknown;
  };

  if (typeof imageBase64 !== 'string' || imageBase64.length === 0) {
    return errorResponse(400, 'Missing imageBase64.');
  }
  if (imageBase64.length > MAX_IMAGE_BYTES) {
    return errorResponse(400, 'Image is too large.');
  }
  const mime =
    typeof mimeType === 'string' && /^image\/(jpeg|png|webp|heic|heif)$/i.test(mimeType)
      ? mimeType
      : 'image/jpeg';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const geminiRes = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inline_data: { mime_type: mime, data: imageBase64 } },
              { text: PROMPT },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    });

    if (!geminiRes.ok) {
      const detail = await geminiRes.text().catch(() => '');
      console.error(`[analyze-food] Gemini error ${geminiRes.status}: ${detail.slice(0, 500)}`);
      return errorResponse(502, 'The analysis service returned an error. Please try again.');
    }

    const payload = (await geminiRes.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = payload.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? '')
      .join('');
    if (!text) {
      return errorResponse(502, 'The analysis service returned an empty result. Please try again.');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return errorResponse(502, 'Could not read the analysis result. Please try again.');
    }

    const estimate = sanitizeEstimate(parsed);
    if (!estimate) {
      return errorResponse(502, 'No meal could be identified in this photo. Please try again.');
    }

    return Response.json(estimate);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return errorResponse(502, 'The analysis service timed out. Please try again.');
    }
    console.error('[analyze-food] request failed:', err);
    return errorResponse(502, 'The analysis service is unreachable. Please try again.');
  } finally {
    clearTimeout(timer);
  }
}
