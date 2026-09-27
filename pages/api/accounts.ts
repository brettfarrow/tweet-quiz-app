import type { NextApiRequest, NextApiResponse } from 'next';
import type { AccountResponse, ApiError } from '@/lib/types';
import { getAccounts } from '@/lib/server/accounts';
import { allowGet, serverError } from '@/lib/server/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse<AccountResponse | ApiError>) {
  if (!allowGet(req, res)) return;
  try {
    const accounts = await getAccounts();
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');
    return res.status(200).json(accounts);
  } catch (error) {
    return serverError(res, 'Unable to load accounts', error);
  }
}
