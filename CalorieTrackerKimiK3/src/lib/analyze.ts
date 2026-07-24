import { FoodEstimate } from './types';

/**
 * Sends a meal photo (base64) to the Expo API route that proxies Gemini.
 * In dev, a relative fetch resolves against the Metro origin.
 */
export async function analyzeFoodImage(base64: string, mimeType = 'image/jpeg'): Promise<FoodEstimate> {
  const res = await fetch('/api/analyze-food', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: base64, mimeType }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Analysis failed (${res.status})`);
  }
  return (await res.json()) as FoodEstimate;
}
