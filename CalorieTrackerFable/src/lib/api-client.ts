/**
 * Shared network layer for all outbound API calls (AI photo analysis, USDA
 * lookups, etc). Centralizes timeout handling, retry/backoff, HTTP status
 * classification, and safe JSON parsing so individual features don't
 * reimplement fragile fetch logic.
 */

export type ApiErrorKind =
  | 'offline' // fetch threw before any response (no connectivity, DNS, etc.)
  | 'timeout' // request exceeded its timeout budget
  | 'rate_limited' // HTTP 429
  | 'auth' // HTTP 401 / 403 (missing or invalid API key)
  | 'not_found' // HTTP 404
  | 'invalid_request' // HTTP 400 or other 4xx we shouldn't retry
  | 'server' // HTTP 5xx
  | 'parse' // response body wasn't valid JSON
  | 'unknown';

export class ApiError extends Error {
  kind: ApiErrorKind;
  status?: number;
  /** Parsed JSON body, if the response had one, even for error statuses. */
  body?: unknown;

  constructor(kind: ApiErrorKind, message: string, status?: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.body = body;
  }
}

export function devLog(...args: unknown[]) {
  // Dev-only diagnostics. Never pass API keys/secrets into this — only
  // method/url/status/timing, which is safe to print.
  if (__DEV__) console.log('[api]', ...args);
}

/**
 * Trims and validates a client-side API key read from an `EXPO_PUBLIC_*`
 * env var. CI secret stores frequently introduce a trailing
 * newline/space when a key is pasted or piped in — that's enough for the
 * upstream API to reject the key as invalid, while a bare `.length > 0`
 * check would still let it through. Also filters out common template
 * placeholder values (e.g. "YOUR_API_KEY_HERE") left over from an
 * unedited `.env.example`, so a forgotten placeholder fails fast as "no
 * key configured" instead of a confusing 401 from the upstream API.
 */
export function sanitizeApiKey(raw: string | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().replace(/^['"]|['"]$/g, '');
  if (!trimmed) return null;
  if (/^(your|xxx|test|placeholder|changeme)/i.test(trimmed)) return null;
  if (trimmed === 'undefined' || trimmed === 'null') return null;
  return trimmed;
}

/**
 * Resolves the base origin for same-app API routes (src/app/api/**+api.ts).
 *
 * On web, relative paths resolve against the current origin automatically.
 * On native, Expo Router polyfills `fetch`/`window.location` to point at the
 * dev server automatically in development. In a *production* native build
 * there is no implicit origin unless one is configured, so we fall back to
 * EXPO_PUBLIC_API_BASE_URL when it's set (e.g. the URL of your deployed
 * Expo server / EAS-hosted API). See README for details.
 */
function resolveApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  return '';
}

export function apiUrl(path: string): string {
  const base = resolveApiBaseUrl();
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

type RequestJsonOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  /** Total time budget per attempt, in ms. */
  timeoutMs?: number;
  /** Additional attempts after the first (0 = no retry). */
  retries?: number;
  /** External signal (e.g. tied to component unmount) that cancels immediately, without retry. */
  signal?: AbortSignal;
};

function classifyStatus(status: number): ApiErrorKind {
  if (status === 401 || status === 403) return 'auth';
  if (status === 404) return 'not_found';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server';
  if (status >= 400) return 'invalid_request';
  return 'unknown';
}

function isRetryable(kind: ApiErrorKind): boolean {
  return kind === 'server' || kind === 'rate_limited' || kind === 'offline' || kind === 'timeout';
}

function backoffDelayMs(attempt: number, retryAfterHeader?: string | null): number {
  if (retryAfterHeader) {
    const seconds = Number(retryAfterHeader);
    if (Number.isFinite(seconds) && seconds > 0) return Math.min(seconds * 1000, 15000);
  }
  const base = 500 * 2 ** attempt;
  const jitter = Math.random() * 250;
  return Math.min(base + jitter, 4000);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Performs a JSON request with a timeout and automatic retry/backoff for
 * transient failures (network errors, timeouts, 429, 5xx). Never retries
 * 4xx client errors like invalid API keys or bad request bodies.
 */
export async function requestJson<T>(url: string, options: RequestJsonOptions = {}): Promise<T> {
  const { method = 'GET', headers, body, timeoutMs = 30000, retries = 2, signal: externalSignal } = options;

  let lastError: ApiError = new ApiError('unknown', 'Request failed');

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (externalSignal?.aborted) {
      throw new ApiError('unknown', 'Request cancelled');
    }

    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);
    const onExternalAbort = () => timeoutController.abort();
    externalSignal?.addEventListener('abort', onExternalAbort);

    const startedAt = Date.now();
    try {
      const response = await fetch(url, { method, headers, body, signal: timeoutController.signal });
      const elapsed = Date.now() - startedAt;

      if (!response.ok) {
        let parsedBody: unknown;
        const text = await response.text().catch(() => '');
        if (text) {
          try {
            parsedBody = JSON.parse(text);
          } catch {
            parsedBody = undefined;
          }
        }
        const kind = classifyStatus(response.status);
        devLog(method, url, '->', response.status, `${elapsed}ms`, kind);
        const message =
          (parsedBody as { message?: string; error?: string } | undefined)?.message ||
          (parsedBody as { message?: string; error?: string } | undefined)?.error ||
          `Request failed with status ${response.status}`;
        const apiError = new ApiError(kind, message, response.status, parsedBody);

        if (isRetryable(kind) && attempt < retries) {
          lastError = apiError;
          await sleep(backoffDelayMs(attempt, response.headers.get('retry-after')));
          continue;
        }
        throw apiError;
      }

      devLog(method, url, '->', response.status, `${elapsed}ms`);

      const text = await response.text();
      if (!text) return undefined as T;
      try {
        return JSON.parse(text) as T;
      } catch {
        throw new ApiError('parse', 'Received an unexpected response from the server.');
      }
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.kind !== 'parse' || attempt >= retries) throw e;
        lastError = e;
        await sleep(backoffDelayMs(attempt));
        continue;
      }

      // Distinguish "we cancelled this on purpose" (unmount) from a real timeout.
      const wasExternallyCancelled = externalSignal?.aborted ?? false;
      const isAbort = e instanceof Error && e.name === 'AbortError';

      if (isAbort && wasExternallyCancelled) {
        throw new ApiError('unknown', 'Request cancelled');
      }
      if (isAbort) {
        devLog(method, url, '-> timeout', `${Date.now() - startedAt}ms`);
        const timeoutError = new ApiError('timeout', 'The request timed out.');
        if (attempt < retries) {
          lastError = timeoutError;
          await sleep(backoffDelayMs(attempt));
          continue;
        }
        throw timeoutError;
      }

      // fetch() throws a plain TypeError for DNS/connectivity failures.
      devLog(method, url, '-> network error', e instanceof Error ? e.message : String(e));
      const offlineError = new ApiError('offline', 'No internet connection.');
      if (attempt < retries) {
        lastError = offlineError;
        await sleep(backoffDelayMs(attempt));
        continue;
      }
      throw offlineError;
    } finally {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', onExternalAbort);
    }
  }

  throw lastError;
}

/** Maps an error from requestJson to a short, non-technical message for the UI. */
export function friendlyErrorMessage(error: unknown, subject: 'ai' | 'usda' = 'ai'): string {
  if (error instanceof ApiError) {
    switch (error.kind) {
      case 'offline':
        return 'No internet connection. Check your connection and try again.';
      case 'timeout':
        return 'That took too long. Check your connection and try again.';
      case 'rate_limited':
        return 'Too many requests. Please try again shortly.';
      case 'auth':
        return subject === 'ai'
          ? 'AI API key is missing or invalid.'
          : 'Food database is not configured correctly.';
      case 'server':
        return subject === 'ai'
          ? 'AI service is temporarily unavailable. Try again in a moment.'
          : 'Food database is temporarily unavailable. Try again in a moment.';
      case 'not_found':
        return 'Food not found.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }
  return 'Something went wrong. Please try again.';
}
