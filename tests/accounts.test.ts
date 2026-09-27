import { beforeEach, expect, it, vi } from 'vitest';
import { getSupabase } from '../lib/server/supabase';

vi.mock('../lib/server/supabase', () => ({ getSupabase: vi.fn() }));
beforeEach(() => { vi.resetModules(); });

function setup(pages: Array<{ data: unknown; error: unknown }>) {
  const query = {
    select: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(pages.shift()).then(resolve),
  };
  vi.mocked(getSupabase).mockReturnValue({ from: vi.fn(() => query) } as unknown as ReturnType<typeof getSupabase>);
  return query;
}

it('paginates past the database row cap and coalesces concurrent cache misses', async () => {
  const first = { account_id: '1', username: 'one', account_display_name: 'One' };
  const second = { account_id: '2', username: 'two', account_display_name: 'Two' };
  const query = setup([{ data: [first], error: null }, { data: [second], error: null }, { data: [], error: null }]);
  const { getAccounts } = await import('../lib/server/accounts');
  const [a, b] = await Promise.all([getAccounts(), getAccounts()]);
  expect(a.data).toEqual([first, second]);
  expect(b).toBe(a);
  expect(query.select).toHaveBeenCalledTimes(3);
  expect(query.gt).toHaveBeenNthCalledWith(1, 'account_id', '1');
  expect(query.gt).toHaveBeenNthCalledWith(2, 'account_id', '2');
  expect(await getAccounts()).toBe(a);
  expect(query.select).toHaveBeenCalledTimes(3);
});

it('does not cache a failed account request', async () => {
  setup([{ data: null, error: new Error('offline') }, { data: [], error: null }]);
  const { getAccounts } = await import('../lib/server/accounts');
  await expect(getAccounts()).rejects.toThrow('offline');
  await expect(getAccounts()).resolves.toMatchObject({ data: [] });
});

it('fetches all requested avatars in one query and tolerates missing profiles', async () => {
  const query = setup([{ data: [{ account_id: '1', avatar_media_url: 'https://example.com/avatar.png' }], error: null }]);
  const { withAvatars } = await import('../lib/server/accounts');
  const result = await withAvatars([
    { account_id: '1', username: 'one', account_display_name: 'One' },
    { account_id: '2', username: 'two', account_display_name: 'Two' },
  ]);
  expect(query.in).toHaveBeenCalledWith('account_id', ['1', '2']);
  expect(query.select).toHaveBeenCalledTimes(1);
  expect(result[0].avatar_media_url).toBe('https://example.com/avatar.png');
  expect(result[1].avatar_media_url).toBeUndefined();
});
