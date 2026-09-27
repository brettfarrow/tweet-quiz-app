const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

interface FetchOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
  timeoutMs?: number;
}

export class HttpError extends Error {
  constructor(public readonly status: number) {
    super(`Request failed (${status}). Please try again.`);
    this.name = 'HttpError';
  }
}

function delay(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    signal?.throwIfAborted();
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/** Retry transient failures on read requests; cancellation stops both fetch and backoff. */
export async function fetchWithRetry<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const { retries = 2, retryDelay = 500, timeoutMs = 12_000, ...init } = options;
  const readOnly = ['GET', 'HEAD'].includes((init.method ?? 'GET').toUpperCase());
  const retryCount = readOnly ? Math.max(0, Math.min(3, Number.isFinite(retries) ? Math.floor(retries) : 2)) : 0;

  for (let attempt = 0; ; attempt++) {
    init.signal?.throwIfAborted();
    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(new DOMException('Request timed out', 'TimeoutError')), timeoutMs);
    try {
      const response = await fetch(url, {
        ...init,
        signal: init.signal ? AbortSignal.any([init.signal, timeout.signal]) : timeout.signal,
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new HttpError(response.status);
      }
      try {
        return await response.json() as T;
      } catch (error) {
        if (error instanceof SyntaxError) throw new SyntaxError('The server returned an invalid response. Please try again.');
        throw error;
      }
    } catch (error) {
      init.signal?.throwIfAborted();
      const retryable = error instanceof HttpError
        ? RETRYABLE_STATUS.has(error.status)
        : error instanceof TypeError || timeout.signal.aborted;
      if (!retryable || attempt >= retryCount) throw error;
    } finally {
      clearTimeout(timer);
    }
    await delay(Math.min(5000, retryDelay * 2 ** attempt), init.signal);
  }
}
