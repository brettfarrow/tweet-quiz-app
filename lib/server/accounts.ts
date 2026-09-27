import type { Account, AccountResponse } from '../types';
import { getSupabase } from './supabase';

const CACHE_TTL_MS = 60 * 60 * 1000;
const PAGE_SIZE = 1000;
let cached: { response: AccountResponse; expiresAt: number } | undefined;
let pending: Promise<AccountResponse> | undefined;

async function fetchAccounts(): Promise<AccountResponse> {
  const accounts: Account[] = [];
  // Keyset pagination also works when the database's row cap is below PAGE_SIZE.
  let cursor: string | undefined;
  while (true) {
    let query = getSupabase().from('account')
      .select('account_id, username, account_display_name')
      .order('account_id', { ascending: true }).limit(PAGE_SIZE);
    if (cursor) query = query.gt('account_id', cursor);
    const { data, error } = await query;
    if (error) throw error;
    if (!data?.length) break;
    accounts.push(...data);
    cursor = data[data.length - 1].account_id;
  }
  return { data: accounts, lastUpdated: new Date().toISOString() };
}

/** Per-process cache; concurrent misses share one database request sequence. */
export async function getAccounts(): Promise<AccountResponse> {
  if (cached && cached.expiresAt > Date.now()) return cached.response;
  if (!pending) {
    pending = fetchAccounts().then(response => {
      cached = { response, expiresAt: Date.now() + CACHE_TTL_MS };
      return response;
    }).finally(() => { pending = undefined; });
  }
  return pending;
}

export async function withAvatars(accounts: Account[]): Promise<Account[]> {
  if (!accounts.length) return accounts;
  try {
    const { data, error } = await getSupabase().from('profile')
      .select('account_id, avatar_media_url')
      .in('account_id', accounts.map(account => account.account_id));
    if (error) throw error;
    const avatars = new Map(data?.map(profile => [profile.account_id, profile.avatar_media_url]));
    return accounts.map(account => ({ ...account, avatar_media_url: avatars.get(account.account_id) }));
  } catch (error) {
    console.error('Unable to load avatars', error);
    return accounts;
  }
}
