import type { Account, Question, Tweet } from './types';
import { sample } from './random';
import { fetchWithRetry, HttpError } from '../utils/fetch';

export async function fetchQuestion(
  username: string | null,
  seen: ReadonlySet<string>,
  signal: AbortSignal,
): Promise<Question> {
  const url = username
    ? `/api/mentions?${new URLSearchParams({ username })}`
    : '/api/random-accounts';
  const accounts = await fetchWithRetry<Account[]>(url, { signal });
  if (!accounts.length) {
    throw new Error(username
      ? 'No mentions found. Try another username or switch to Random.'
      : 'No accounts found. Please try again.');
  }

  let repeated: Tweet | undefined;
  // Try each candidate once, skipping empty archives and preferring unseen tweets.
  for (const account of sample(accounts, accounts.length)) {
    try {
      const tweet = await fetchWithRetry<Tweet>(
        `/api/random-tweet?${new URLSearchParams({ account_id: account.account_id })}`, { signal },
      );
      if (!seen.has(tweet.tweet_id)) return { tweet, accounts };
      repeated = tweet;
    } catch (error) {
      if (!(error instanceof HttpError && error.status === 404)) throw error;
    }
  }
  // Small archives may be exhausted. Reuse a real tweet, never fabricate one.
  if (repeated) return { tweet: repeated, accounts };
  throw new Error('No tweets found for these accounts. Please try again.');
}

export interface Stats { correct: number; total: number }
export const EMPTY_STATS: Stats = { correct: 0, total: 0 };

export function readStats(): Stats {
  try {
    const value = JSON.parse(localStorage.getItem('tweetQuizStats') ?? 'null');
    if (value && Number.isSafeInteger(value.correct) && Number.isSafeInteger(value.total)
      && value.correct >= 0 && value.total >= value.correct) {
      return { correct: value.correct, total: value.total };
    }
  } catch { /* Storage can be unavailable or contain malformed data. */ }
  return EMPTY_STATS;
}

export function saveStats(stats: Stats) {
  try {
    localStorage.setItem('tweetQuizStats', JSON.stringify(stats));
  } catch { /* The quiz remains playable when storage is disabled or full. */ }
}
