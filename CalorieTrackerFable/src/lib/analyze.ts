import type { AnalysisResult } from './types';

/**
 * Sends a captured meal photo (base64) to the Expo API route, which forwards
 * it to Gemini. Relative fetch targets the dev server / deployed origin.
 */
export async function analyzeMealPhoto(
  base64: string,
  mimeType: string = 'image/jpeg',
): Promise<AnalysisResult> {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: base64, mimeType }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Analysis failed (${response.status}): ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as AnalysisResult;
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
