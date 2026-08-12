import { GEMINI_MODELS, GEMINI_PROMPT, GEMINI_RESPONSE_SCHEMA } from '@/lib/gemini-prompt';

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // 401 (not 500) so the client can tell "misconfigured" apart from a
    // transient server failure and show "AI API key is missing or invalid."
    return Response.json(
      { error: 'missing_api_key', message: 'GEMINI_API_KEY is not configured' },
      { status: 401 },
    );
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
          { text: GEMINI_PROMPT },
          { inline_data: { mime_type: mimeType, data: imageBase64 } },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: GEMINI_RESPONSE_SCHEMA,
      temperature: 0.2,
    },
  };

  let lastError = 'Unknown error';
  for (const model of GEMINI_MODELS) {
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
        const bodyText = await res.text().catch(() => '');
        lastError = `${model} returned ${res.status}: ${bodyText.slice(0, 300)}`;

        // An invalid/revoked key fails the same way for every model — no
        // point burning the retry budget or trying the fallback model.
        if (res.status === 401 || res.status === 403) {
          return Response.json(
            { error: 'invalid_api_key', message: 'Gemini rejected the configured API key.' },
            { status: 401 },
          );
        }
        // Gemini's own rate-limit status — surface it as-is so the client
        // can show "Too many requests" instead of a generic failure.
        if (res.status === 429) {
          return Response.json(
            { error: 'rate_limited', message: 'Gemini API rate limit reached.' },
            { status: 429 },
          );
        }
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
