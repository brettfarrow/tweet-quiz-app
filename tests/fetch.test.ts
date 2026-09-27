import { afterEach, expect, it, vi } from 'vitest';
import { fetchWithRetry, HttpError } from '../utils/fetch';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

it('does not retry permanent HTTP errors or expose the response body', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('database password', { status: 400 }));
  vi.stubGlobal('fetch', fetch);
  await expect(fetchWithRetry('/api/test')).rejects.toMatchObject({ status: 400 });
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('retries transient read failures and preserves Headers instances', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(new Response('', { status: 503 }))
    .mockResolvedValueOnce(Response.json({ ok: true }));
  vi.stubGlobal('fetch', fetch);
  const headers = new Headers({ 'X-Test': 'value' });
  await expect(fetchWithRetry('/api/test', { headers, retryDelay: 0 })).resolves.toEqual({ ok: true });
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch.mock.calls[1][1].headers.get('X-Test')).toBe('value');
});

it('does not replay mutations or retry invalid JSON', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(new Response('', { status: 503 }))
    .mockResolvedValueOnce(new Response('not json'));
  vi.stubGlobal('fetch', fetch);
  await expect(fetchWithRetry('/api/test', { method: 'POST' })).rejects.toBeInstanceOf(HttpError);
  await expect(fetchWithRetry('/api/test')).rejects.toBeInstanceOf(SyntaxError);
  expect(fetch).toHaveBeenCalledTimes(2);
});

it('cancels during backoff without issuing another request', async () => {
  vi.useFakeTimers();
  const controller = new AbortController();
  const fetch = vi.fn().mockRejectedValue(new TypeError('offline'));
  vi.stubGlobal('fetch', fetch);
  const request = fetchWithRetry('/api/test', { signal: controller.signal });
  const result = expect(request).rejects.toMatchObject({ name: 'AbortError' });
  await vi.advanceTimersByTimeAsync(0);
  controller.abort();
  await result;
  await vi.runAllTimersAsync();
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('times out stalled requests and stops after the retry budget', async () => {
  vi.useFakeTimers();
  const fetch = vi.fn().mockImplementation((_url, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true });
  }));
  vi.stubGlobal('fetch', fetch);
  const request = fetchWithRetry('/api/test', { timeoutMs: 10, retryDelay: 1, retries: 1 });
  const result = expect(request).rejects.toMatchObject({ name: 'TimeoutError' });
  await vi.runAllTimersAsync();
  await result;
  expect(fetch).toHaveBeenCalledTimes(2);
});
