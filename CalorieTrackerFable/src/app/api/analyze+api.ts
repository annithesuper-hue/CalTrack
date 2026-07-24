const MODELS = ['gemini-3-flash-preview', 'gemini-2.5-flash'];

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

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 });
  }

  let body: { imageBase64?: string; mimeType?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { imageBase64, mimeType = 'image/jpeg' } = body;
  if (!imageBase64) {
    return Response.json({ error: 'imageBase64 is required' }, { status: 400 });
  }

  const payload = {
    contents: [
      {
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: mimeType, data: imageBase64 } },
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
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        lastError = `${model} returned ${res.status}: ${(await res.text()).slice(0, 300)}`;
        continue;
      }

      const data = await res.json();
      const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        lastError = `${model} returned no content`;
        continue;
      }

      const parsed = JSON.parse(text);
      if (!parsed.isFood) {
        return Response.json({ error: 'no_food', message: 'No food detected in this photo.' }, { status: 422 });
      }
      return Response.json(parsed);
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  return Response.json({ error: 'analysis_failed', message: lastError }, { status: 502 });
}
