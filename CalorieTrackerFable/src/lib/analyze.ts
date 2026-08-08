import { ApiError, apiFetch } from './api-client';
import type { AnalysisResult } from './types';

const __DEV__ = process.env.NODE_ENV !== 'production';

const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    isFood: { type: 'BOOLEAN', description: 'Whether the image contains food or drink' },
    name: { type: 'STRING', description: 'Short dish name, e.g. "Chicken Caesar Salad"' },
    emoji: { type: 'STRING', description: 'Single food emoji that best represents the dish' },
    calories: { type: 'NUMBER', description: 'Estimated total kcal for the visible portion' },
    protein: { type: 'NUMBER', description: 'Estimated protein in grams' },
    carbs: { type: 'NUMBER', description: 'Estimated carbohydrates in grams' },
    fat: { type: 'NUMBER', description: 'Estimated fat in grams' },
    confidence: { type: 'STRING', enum: ['low', 'medium', 'high'] },
    items: {
      type: 'ARRAY',
      description: 'Individual components of the meal with their calorie share',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          calories: { type: 'NUMBER' },
        },
        required: ['name', 'calories'],
      },
    },
  },
  required: ['isFood', 'name', 'emoji', 'calories', 'protein', 'carbs', 'fat', 'confidence', 'items'],
};

const PROMPT = `You are a professional nutritionist analyzing a photo of a meal.
Estimate the nutrition of the visible portion as accurately as possible.

Rules:
- Judge portion size from visual cues (plate size, utensils, packaging).
- "calories" must be consistent with the macros (protein*4 + carbs*4 + fat*9 should be within ~15% of calories).
- Break the meal into its main components in "items" (2-6 items), whose calories roughly sum to the total.
- If the image does not contain food or drink, set isFood to false and all numbers to 0.
- Be realistic: a typical restaurant main is 500-900 kcal, a snack 100-300 kcal.`;

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

/**
 * Sends a captured meal photo (base64) directly to Google Gemini.
 * Uses EXPO_PUBLIC_GEMINI_API_KEY so the key is available at runtime in native builds.
 */
export async function analyzeMealPhoto(
  base64: string,
  mimeType: string = 'image/jpeg',
): Promise<AnalysisResult> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new ApiError('unauthorized', 'AI API key is not configured.');
  }

  const payload = {
    contents: [
      {
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: mimeType, data: base64 } },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.2,
    },
  };

  let lastError = 'Unknown error';

  for (const model of MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    try {
      if (__DEV__) console.log(`[analyze] Trying model: ${model}`);

      const data = await apiFetch<GeminiResponse>(url, {
        method: 'POST',
        headers: { 'x-goog-api-key': apiKey },
        body: JSON.stringify(payload),
        timeoutMs: 60000,
        retries: 1,
      });

      const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        lastError = `${model} returned no content`;
        if (__DEV__) console.warn(`[analyze] ${lastError}`);
        continue;
      }

      let parsed: AnalysisResult;
      try {
        parsed = JSON.parse(text);
      } catch {
        lastError = `${model} returned malformed JSON`;
        if (__DEV__) console.warn(`[analyze] ${lastError}`);
        continue;
      }

      if (!parsed.isFood) {
        throw new ApiError('no_food', 'No food detected in this photo.');
      }

      return {
        name: parsed.name || 'Meal',
        emoji: parsed.emoji || '🍽️',
        calories: Math.max(0, Math.round(parsed.calories ?? 0)),
        protein: Math.max(0, Math.round(parsed.protein ?? 0)),
        carbs: Math.max(0, Math.round(parsed.carbs ?? 0)),
        fat: Math.max(0, Math.round(parsed.fat ?? 0)),
        confidence: parsed.confidence ?? 'medium',
        items: Array.isArray(parsed.items) ? parsed.items : [],
      };
    } catch (e) {
      if (e instanceof ApiError && (e.type === 'no_food' || e.type === 'unauthorized' || e.type === 'bad_request')) {
        throw e;
      }
      lastError = e instanceof Error ? e.message : String(e);
      if (__DEV__) console.warn(`[analyze] ${model} failed: ${lastError}`);
    }
  }

  throw new ApiError('server_error', lastError);
}
