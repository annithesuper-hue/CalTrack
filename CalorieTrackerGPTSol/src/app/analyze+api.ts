import type { MealEstimate } from '@/lib/types';

const MODEL = 'gemini-3.6-flash';
const MAX_BASE64_LENGTH = 16_000_000;

function isEstimate(value: unknown): value is MealEstimate {
  if (!value || typeof value !== 'object') return false;
  const estimate = value as Record<string, unknown>;
  return (
    typeof estimate.name === 'string' &&
    typeof estimate.description === 'string' &&
    typeof estimate.calories === 'number' &&
    typeof estimate.protein === 'number' &&
    typeof estimate.carbs === 'number' &&
    typeof estimate.fat === 'number' &&
    typeof estimate.confidence === 'number' &&
    Array.isArray(estimate.items)
  );
}

function clampEstimate(estimate: MealEstimate): MealEstimate {
  return {
    name: estimate.name.trim().slice(0, 80) || 'Meal',
    description: estimate.description.trim().slice(0, 220),
    calories: Math.max(0, Math.round(estimate.calories)),
    protein: Math.max(0, Math.round(estimate.protein)),
    carbs: Math.max(0, Math.round(estimate.carbs)),
    fat: Math.max(0, Math.round(estimate.fat)),
    confidence: Math.max(0, Math.min(1, estimate.confidence)),
    items: estimate.items
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 12),
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'Gemini is not configured.' }, { status: 500 });
  }

  let body: { image?: string; mimeType?: string };
  try {
    body = (await request.json()) as { image?: string; mimeType?: string };
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!body.image || body.image.length > MAX_BASE64_LENGTH) {
    return Response.json({ error: 'A smaller meal image is required.' }, { status: 400 });
  }
  const mimeType = body.mimeType?.startsWith('image/') ? body.mimeType : 'image/jpeg';

  const prompt = `Act as a careful nutrition analyst. Identify every visible food and drink.
Estimate the entire visible portion, not a generic serving. Return total calories and macros in grams.
Use a short appetizing meal name, a one-sentence description, a confidence from 0 to 1, and a list
of visible food components. If the image is not food, use name "No meal detected", all nutrition
values 0, confidence 0, and explain that in the description. Never include markdown.`;

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inlineData: { mimeType, data: body.image } },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.15,
          responseMimeType: 'application/json',
          responseJsonSchema: {
            type: 'object',
            required: [
              'name',
              'description',
              'calories',
              'protein',
              'carbs',
              'fat',
              'confidence',
              'items',
            ],
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              calories: { type: 'number', minimum: 0 },
              protein: { type: 'number', minimum: 0 },
              carbs: { type: 'number', minimum: 0 },
              fat: { type: 'number', minimum: 0 },
              confidence: { type: 'number', minimum: 0, maximum: 1 },
              items: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      }),
    }
  );

  if (!geminiResponse.ok) {
    const detail = await geminiResponse.text();
    console.error('Gemini error', geminiResponse.status, detail.slice(0, 500));
    return Response.json(
      { error: 'The meal could not be analyzed. Please try again.' },
      { status: 502 }
    );
  }

  const payload = (await geminiResponse.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
  if (!text) {
    return Response.json({ error: 'Gemini returned an empty estimate.' }, { status: 502 });
  }

  try {
    const estimate = JSON.parse(text) as unknown;
    if (!isEstimate(estimate)) throw new Error('Unexpected estimate shape');
    return Response.json(clampEstimate(estimate));
  } catch (error) {
    console.error('Gemini parse error', error);
    return Response.json({ error: 'Gemini returned an invalid estimate.' }, { status: 502 });
  }
}

