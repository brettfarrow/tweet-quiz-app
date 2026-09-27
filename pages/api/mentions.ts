import type { NextApiRequest, NextApiResponse } from 'next';
import type { Account, ApiError } from '@/lib/types';
import { sample } from '@/lib/random';
import { normalizeUsername } from '@/lib/validation';
import { getSupabase } from '@/lib/server/supabase';
import { withAvatars } from '@/lib/server/accounts';
import { allowGet, serverError } from '@/lib/server/api';

type Mention = { tweets: { account: Account | null } | null };

export default async function handler(req: NextApiRequest, res: NextApiResponse<Account[] | ApiError>) {
  if (!allowGet(req, res)) return;
  const username = normalizeUsername(req.query.username);
  if (!username) return res.status(400).json({ error: 'A valid username is required' });

  try {
    const supabase = getSupabase();
    const { data: user, error: userError } = await supabase.from('mentioned_users')
      .select('user_id').eq('screen_name', username).maybeSingle();
    if (userError) throw userError;
    if (!user) return res.status(200).json([]);

    const { data, error } = await supabase.from('user_mentions')
      .select('tweets (account:account (account_id, username, account_display_name))')
      .eq('mentioned_user_id', user.user_id)
      .order('tweet_id', { ascending: false }).limit(100)
      .overrideTypes<Mention[], { merge: false }>();
    if (error) throw error;

    const accounts = new Map<string, Account>();
    for (const mention of data ?? []) {
      const account = mention.tweets?.account;
      if (account?.account_id && account.username) accounts.set(account.account_id, account);
    }
    return res.status(200).json(await withAvatars(sample([...accounts.values()], 4)));
  } catch (error) {
    return serverError(res, 'Unable to load mentions', error);
  }
}
