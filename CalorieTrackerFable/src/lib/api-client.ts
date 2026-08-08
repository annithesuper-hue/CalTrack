export type ApiErrorType =
  | 'no_network'
  | 'timeout'
  | 'bad_request'
  | 'unauthorized'
  | 'forbidden'
  | 'rate_limit'
  | 'server_error'
  | 'not_found'
  | 'parse_error'
  | 'no_food'
  | 'unknown';

export class ApiError extends Error {
  type: ApiErrorType;
  status?: number;
  constructor(type: ApiErrorType, message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.type = type;
    this.status = status;
  }
}

/** Human-readable messages safe to show users — no secrets. */
export function userMessageForError(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.type) {
      case 'no_network':
        return 'No internet connection. Check your connection and try again.';
      case 'timeout':
        return 'The request took too long. Check your connection and try again.';
      case 'unauthorized':
      case 'forbidden':
        return 'AI API key is missing or invalid.';
      case 'rate_limit':
        return 'Too many requests. Please try again shortly.';
      case 'server_error':
        return 'AI service is temporarily unavailable. Try again in a moment.';
      case 'not_found':
        return 'Food not found.';
      case 'no_food':
        return "We couldn't find food in that photo. Try again with the meal in frame.";
      case 'bad_request':
        return 'Something went wrong with the request. Try again.';
      default:
        return err.message || 'Something went wrong. Try again.';
    }
  }
  return 'Something went wrong. Try again.';
}

function isRetryable(type: ApiErrorType): boolean {
  return type === 'no_network' || type === 'timeout' || type === 'server_error' || type === 'rate_limit';
}

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  retries?: number;
  signal?: AbortSignal;
};

function classifyStatus(status: number): ApiErrorType {
  if (status === 400 || status === 422) return 'bad_request';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 429) return 'rate_limit';
  if (status >= 500) return 'server_error';
  return 'unknown';
}

const __DEV__ = process.env.NODE_ENV !== 'production';

/**
 * Robust fetch wrapper with timeout, retry, and error classification.
 * Never logs secrets — only status codes and error types in dev mode.
 */
export async function apiFetch<T>(
  url: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = 'GET',
    headers = {},
    body,
    timeoutMs = 30000,
    retries = 2,
    signal: externalSignal,
  } = options;

  let lastError: ApiError = new ApiError('unknown', 'Unknown error');

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    if (externalSignal) {
      if (externalSignal.aborted) controller.abort();
      else externalSignal.addEventListener('abort', () => controller.abort());
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorType = classifyStatus(res.status);
        if (__DEV__) {
          console.warn(`[apiFetch] ${method} ${url} → ${res.status} (${errorType})`);
        }
        lastError = new ApiError(errorType, `HTTP ${res.status}`, res.status);

        if (isRetryable(errorType) && attempt < retries) {
          await backoff(attempt);
          continue;
        }
        throw lastError;
      }

      const text = await res.text();
      try {
        return JSON.parse(text) as T;
      } catch {
        if (__DEV__) console.warn('[apiFetch] Malformed JSON response');
        throw new ApiError('parse_error', 'Received an invalid response from the server.');
      }
    } catch (e) {
      clearTimeout(timeoutId);

      if (e instanceof ApiError) throw e;

      if (e instanceof DOMException && e.name === 'AbortError') {
        if (externalSignal?.aborted) {
          throw new ApiError('unknown', 'Request cancelled.');
        }
        lastError = new ApiError('timeout', 'Request timed out.');
      } else if (e instanceof TypeError) {
        lastError = new ApiError('no_network', 'No internet connection.');
      } else {
        lastError = new ApiError('unknown', e instanceof Error ? e.message : String(e));
      }

      if (__DEV__) {
        console.warn(`[apiFetch] attempt ${attempt + 1} failed: ${lastError.type} — ${lastError.message}`);
      }

      if (isRetryable(lastError.type) && attempt < retries) {
        await backoff(attempt);
        continue;
      }
      throw lastError;
    }
  }

  throw lastError;
}

function backoff(attempt: number): Promise<void> {
  const delay = Math.min(1000 * 2 ** attempt, 8000);
  return new Promise((resolve) => setTimeout(resolve, delay));
}
