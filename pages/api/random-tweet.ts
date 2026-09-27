import type { NextApiRequest, NextApiResponse } from 'next';
import type { Tweet, ApiError } from '@/lib/types';
import { isAccountId } from '@/lib/validation';
import { getSupabase } from '@/lib/server/supabase';
import { allowGet, serverError } from '@/lib/server/api';

const SORT_COLUMNS = ['created_at', 'tweet_id', 'favorite_count', 'retweet_count'] as const;

export default async function handler(req: NextApiRequest, res: NextApiResponse<Tweet | ApiError>) {
  if (!allowGet(req, res)) return;
  const accountId = req.query.account_id;
  if (!isAccountId(accountId)) return res.status(400).json({ error: 'A valid account_id is required' });

  try {
    // Bounded sample of several orderings; this is not uniform over the full archive.
    const column = SORT_COLUMNS[Math.floor(Math.random() * SORT_COLUMNS.length)];
    const { data, error } = await getSupabase().from('tweets')
      .select('tweet_id, account_id, created_at, full_text, retweet_count, favorite_count')
      .eq('account_id', accountId)
      .order(column, { ascending: Math.random() > 0.5 }).limit(20);
    if (error) throw error;
    if (!data?.length) return res.status(404).json({ error: 'No tweets found for this account' });
    return res.status(200).json(data[Math.floor(Math.random() * data.length)]);
  } catch (error) {
    return serverError(res, 'Unable to load a tweet', error);
  }
}
