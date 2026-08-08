/** Shared between src/app/api/analyze+api.ts (server) and src/lib/gemini-client.ts (direct-from-device fallback). */

export const GEMINI_MODELS = ['gemini-3-flash-preview', 'gemini-2.5-flash'];

export const GEMINI_RESPONSE_SCHEMA = {
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

export const GEMINI_PROMPT = `You are a professional nutritionist analyzing a photo of a meal.
Estimate the nutrition of the visible portion as accurately as possible.

Rules:
- Judge portion size from visual cues (plate size, utensils, packaging).
- "calories" must be consistent with the macros (protein*4 + carbs*4 + fat*9 should be within ~15% of calories).
- Break the meal into its main components in "items" (2-6 items), whose calories roughly sum to the total.
- If the image does not contain food or drink, set isFood to false and all numbers to 0.
- Be realistic: a typical restaurant main is 500-900 kcal, a snack 100-300 kcal.`;
