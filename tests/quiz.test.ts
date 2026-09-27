import { afterEach, expect, it, vi } from 'vitest';
import { fetchQuestion, readStats, saveStats } from '../lib/quiz';
import { fetchWithRetry, HttpError } from '../utils/fetch';
import { normalizeUsername, isAccountId } from '../lib/validation';

vi.mock('../utils/fetch', async importOriginal => ({
  ...await importOriginal<typeof import('../utils/fetch')>(), fetchWithRetry: vi.fn(),
}));
const fetchMock = vi.mocked(fetchWithRetry);
afterEach(() => { fetchMock.mockReset(); vi.unstubAllGlobals(); });

const accounts = [
  { account_id: '1', username: 'one', account_display_name: 'One' },
  { account_id: '2', username: 'two', account_display_name: 'Two' },
];

it('normalizes usernames and rejects repeated or malformed query parameters', () => {
  expect(normalizeUsername(' @Alice_1 ')).toBe('Alice_1');
  for (const value of ['', 'a&refresh=true', ['alice'], 'a'.repeat(16)]) {
    expect(normalizeUsername(value)).toBeNull();
  }
  expect(isAccountId('12345678901234567890')).toBe(true);
  for (const value of ['', ['1'], '1 OR 1=1', '1'.repeat(21)]) expect(isAccountId(value)).toBe(false);
});

it('tries another author when an archive has no tweets', async () => {
  vi.spyOn(Math, 'random').mockReturnValue(0);
  fetchMock.mockResolvedValueOnce(accounts).mockRejectedValueOnce(new HttpError(404))
    .mockResolvedValueOnce({ tweet_id: '20', account_id: '2' });
  const question = await fetchQuestion(null, new Set(), new AbortController().signal);
  expect(question.tweet.account_id).toBe('2');
  expect(fetchMock.mock.calls[2][0]).toBe('/api/random-tweet?account_id=2');
});

it('prefers unseen tweets but reuses real data if a small archive is exhausted', async () => {
  fetchMock.mockResolvedValueOnce(accounts)
    .mockResolvedValueOnce({ tweet_id: '10' }).mockResolvedValueOnce({ tweet_id: '20' });
  expect((await fetchQuestion(null, new Set(['10']), new AbortController().signal)).tweet.tweet_id).toBe('20');
  fetchMock.mockResolvedValueOnce(accounts.slice(0, 1)).mockResolvedValueOnce({ tweet_id: '10' });
  expect((await fetchQuestion(null, new Set(['10']), new AbortController().signal)).tweet.tweet_id).toBe('10');
});

it('never fabricates a tweet when all accounts are empty', async () => {
  fetchMock.mockResolvedValueOnce(accounts).mockRejectedValue(new HttpError(404));
  await expect(fetchQuestion(null, new Set(), new AbortController().signal)).rejects.toThrow('No tweets found');
  expect(fetchMock).toHaveBeenCalledTimes(3);
});

it('does not multiply a server outage into requests for every author', async () => {
  fetchMock.mockResolvedValueOnce(accounts).mockRejectedValue(new HttpError(500));
  await expect(fetchQuestion(null, new Set(), new AbortController().signal)).rejects.toMatchObject({ status: 500 });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('recovers from malformed, invalid, and unavailable storage', () => {
  const getItem = vi.fn().mockReturnValueOnce('{bad json').mockReturnValueOnce('{"correct":10,"total":1}')
    .mockReturnValueOnce('{"correct":1,"total":2}').mockImplementation(() => { throw new Error('blocked'); });
  vi.stubGlobal('localStorage', { getItem, setItem: () => { throw new Error('full'); } });
  expect(readStats()).toEqual({ correct: 0, total: 0 });
  expect(readStats()).toEqual({ correct: 0, total: 0 });
  expect(readStats()).toEqual({ correct: 1, total: 2 });
  expect(readStats()).toEqual({ correct: 0, total: 0 });
  expect(() => saveStats({ correct: 1, total: 2 })).not.toThrow();
});
