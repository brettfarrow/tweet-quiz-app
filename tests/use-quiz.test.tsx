// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useQuiz } from '../hooks/use-quiz';
import { fetchQuestion } from '../lib/quiz';
import type { Question } from '../lib/types';

vi.mock('../lib/quiz', async importOriginal => ({
  ...await importOriginal<typeof import('../lib/quiz')>(), fetchQuestion: vi.fn(),
}));
const fetchMock = vi.mocked(fetchQuestion);
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function question(id: string): Question {
  return {
    tweet: { tweet_id: id, account_id: '1', full_text: id, created_at: '2025-01-01', retweet_count: 0, favorite_count: 0 },
    accounts: [{ account_id: '1', username: 'one', account_display_name: 'One' }],
  };
}
beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  fetchMock.mockImplementation(() => new Promise(() => {}));
});
afterEach(cleanup);

it('shows the first question before prefetch completes and excludes it from prefetch', async () => {
  const second = deferred<Question>();
  fetchMock.mockResolvedValueOnce(question('first')).mockReturnValueOnce(second.promise);
  const { result } = renderHook(useQuiz);
  await waitFor(() => expect(result.current.currentQuestion?.tweet.tweet_id).toBe('first'));
  expect(result.current.loading).toBe(false);
  expect(result.current.preloading).toBe(true);
  expect(fetchMock.mock.calls[1][1].has('first')).toBe(true);
  await act(async () => second.resolve(question('second')));
  expect(result.current.preloading).toBe(false);
});

it('cancels stale mode requests and ignores their late results', async () => {
  const old = deferred<Question>();
  const newer = deferred<Question>();
  fetchMock.mockReturnValueOnce(old.promise).mockReturnValueOnce(newer.promise);
  const { result, unmount } = renderHook(useQuiz);
  const oldSignal = fetchMock.mock.calls[0][2];
  act(() => { void result.current.start('alice'); });
  expect(oldSignal.aborted).toBe(true);
  await act(async () => newer.resolve(question('alice')));
  await act(async () => old.resolve(question('stale')));
  expect(result.current.currentQuestion?.tweet.tweet_id).toBe('alice');
  expect(result.current.activeUsername).toBe('alice');
  const activeSignal = fetchMock.mock.calls[1][2];
  unmount();
  expect(activeSignal.aborted).toBe(true);
});

it('counts one answer and consumes a prefetched question only once on rapid clicks', async () => {
  fetchMock.mockResolvedValueOnce(question('first')).mockResolvedValueOnce(question('second'));
  const { result } = renderHook(useQuiz);
  await waitFor(() => expect(result.current.loading || result.current.preloading).toBe(false));
  act(() => {
    result.current.handleGuess('1');
    result.current.handleGuess('1');
  });
  expect(result.current.stats).toEqual({ correct: 1, total: 1 });
  act(() => {
    result.current.handleNextQuestion();
    result.current.handleNextQuestion();
  });
  expect(result.current.currentQuestion?.tweet.tweet_id).toBe('second');
  expect(result.current.selectedAnswer).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(3);
});

it('keeps the current question on prefetch failure and allows retry', async () => {
  fetchMock.mockResolvedValueOnce(question('first')).mockRejectedValueOnce(new Error('offline'));
  const { result } = renderHook(useQuiz);
  await waitFor(() => expect(result.current.error).toBe('offline'));
  expect(result.current.currentQuestion?.tweet.tweet_id).toBe('first');
  fetchMock.mockResolvedValueOnce(question('recovered'));
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.error).toBeNull());
  await waitFor(() => expect(result.current.preloading).toBe(false));
  act(() => result.current.handleGuess('1'));
  act(() => result.current.handleNextQuestion());
  expect(result.current.currentQuestion?.tweet.tweet_id).toBe('recovered');
});

it('retries an initial failure in the same mode', async () => {
  fetchMock.mockRejectedValueOnce(new Error('offline'));
  const { result } = renderHook(useQuiz);
  await waitFor(() => expect(result.current.error).toBe('offline'));
  expect(result.current.loading).toBe(false);
  fetchMock.mockResolvedValueOnce(question('recovered'));
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.currentQuestion?.tweet.tweet_id).toBe('recovered'));
  expect(result.current.error).toBeNull();
});
