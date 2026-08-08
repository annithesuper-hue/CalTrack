/**
 * Looks up a branded food by UPC/EAN barcode using USDA FoodData Central.
 *
 * GET /api/usda-lookup?barcode=049000028911
 *
 * The USDA API has no dedicated "search by barcode" endpoint — branded
 * items include their GTIN/UPC on the record, so we search and filter for
 * an exact match. Kept server-side (like /api/analyze) so USDA_API_KEY is
 * never bundled into the client.
 */

const USDA_SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';

/** Strips leading zeros so "0049000028911" and "49000028911" compare equal. */
function normalizeCode(code: string): string {
  return code.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
}

export async function GET(request: Request): Promise<Response> {
  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'missing_api_key', message: 'USDA_API_KEY is not configured' },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const barcode = searchParams.get('barcode')?.trim();
  if (!barcode) {
    return Response.json({ error: 'invalid_request', message: 'barcode is required' }, { status: 400 });
  }

  const url = new URL(USDA_SEARCH_URL);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('query', barcode);
  url.searchParams.set('dataType', 'Branded');
  url.searchParams.set('pageSize', '10');

  let res: Response;
  try {
    res = await fetch(url.toString());
  } catch (e) {
    return Response.json(
      { error: 'upstream_unreachable', message: e instanceof Error ? e.message : 'Failed to reach USDA' },
      { status: 502 },
    );
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      return Response.json(
        { error: 'invalid_api_key', message: 'USDA rejected the configured API key.' },
        { status: 401 },
      );
    }
    if (res.status === 429) {
      return Response.json({ error: 'rate_limited', message: 'USDA API rate limit reached.' }, { status: 429 });
    }
    const bodyText = await res.text().catch(() => '');
    return Response.json(
      { error: 'upstream_error', message: `USDA returned ${res.status}: ${bodyText.slice(0, 300)}` },
      { status: 502 },
    );
  }

  const data = await res.json().catch(() => null);
  const foods: unknown[] = Array.isArray(data?.foods) ? data.foods : [];

  const target = normalizeCode(barcode);
  const match = foods.find((food) => {
    const gtin = (food as { gtinUpc?: string }).gtinUpc;
    return typeof gtin === 'string' && normalizeCode(gtin) === target;
  });

  if (!match) {
    return Response.json(
      { error: 'not_found', message: 'No matching product found in USDA FoodData Central.' },
      { status: 404 },
    );
  }

  return Response.json({ food: match });
}
