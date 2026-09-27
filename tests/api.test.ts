import { beforeEach, expect, it, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import accountsHandler from '../pages/api/accounts';
import randomAccountsHandler from '../pages/api/random-accounts';
import mentionsHandler from '../pages/api/mentions';
import tweetHandler from '../pages/api/random-tweet';
import { getSupabase } from '../lib/server/supabase';
import { getAccounts, withAvatars } from '../lib/server/accounts';

vi.mock('../lib/server/supabase', () => ({ getSupabase: vi.fn() }));
vi.mock('../lib/server/accounts', () => ({ getAccounts: vi.fn(), withAvatars: vi.fn() }));

function request(query: NextApiRequest['query'] = {}, method = 'GET') {
  return { method, query } as NextApiRequest;
}
function response() {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), setHeader: vi.fn() };
  return res as unknown as NextApiResponse;
}
function database(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result), maybeSingle: vi.fn().mockResolvedValue(result),
  };
  vi.mocked(getSupabase).mockReturnValue({ from: vi.fn(() => query) } as unknown as ReturnType<typeof getSupabase>);
  return query;
}
beforeEach(() => { vi.mocked(getSupabase).mockReset(); vi.spyOn(console, 'error').mockImplementation(() => {}); });

it.each([accountsHandler, randomAccountsHandler, mentionsHandler, tweetHandler])('rejects unsupported methods without querying the database', async handler => {
  const res = response();
  await handler(request({}, 'POST'), res);
  expect(res.status).toHaveBeenCalledWith(405);
  expect(res.setHeader).toHaveBeenCalledWith('Allow', 'GET');
  expect(getSupabase).not.toHaveBeenCalled();
  expect(getAccounts).not.toHaveBeenCalled();
});

it.each([{ account_id: ['1', '2'] }, { account_id: 'bad' }, {}])('validates tweet parameters before database access', async query => {
  const res = response();
  await tweetHandler(request(query), res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(getSupabase).not.toHaveBeenCalled();
});

it('treats an unknown mentioned user as an empty result, not a server error', async () => {
  database({ data: null, error: null });
  const res = response();
  await mentionsHandler(request({ username: '@alice' }), res);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith([]);
});

it('rejects a username with query syntax', async () => {
  const res = response();
  await mentionsHandler(request({ username: 'alice&extra=1' }), res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(getSupabase).not.toHaveBeenCalled();
});

it('hides database details and never caches errors', async () => {
  database({ data: null, error: { message: 'secret schema and credentials' } });
  const res = response();
  await tweetHandler(request({ account_id: '1' }), res);
  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({ error: 'Unable to load quiz data. Please try again.' });
  expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
});

it('returns 404 for an empty archive without a second database query', async () => {
  const query = database({ data: [], error: null });
  const res = response();
  await tweetHandler(request({ account_id: '1' }), res);
  expect(res.status).toHaveBeenCalledWith(404);
  expect(query.select).toHaveBeenCalledTimes(1);
});

it('samples accounts through shared data access without an internal HTTP request', async () => {
  const accounts = Array.from({ length: 6 }, (_, i) => ({ account_id: String(i), username: String(i), account_display_name: String(i) }));
  vi.mocked(getAccounts).mockResolvedValue({ data: accounts, lastUpdated: 'today' });
  vi.mocked(withAvatars).mockImplementation(async accounts => accounts);
  const res = response();
  await randomAccountsHandler(request(), res);
  const selected = vi.mocked(withAvatars).mock.calls[0][0];
  expect(selected).toHaveLength(4);
  expect(new Set(selected.map(account => account.account_id)).size).toBe(4);
  expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
});
