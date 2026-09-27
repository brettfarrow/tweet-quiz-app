import type { NextApiRequest, NextApiResponse } from 'next';
import type { Account, ApiError } from '@/lib/types';
import { sample } from '@/lib/random';
import { getAccounts, withAvatars } from '@/lib/server/accounts';
import { allowGet, serverError } from '@/lib/server/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse<Account[] | ApiError>) {
  if (!allowGet(req, res)) return;
  try {
    const { data } = await getAccounts();
    return res.status(200).json(await withAvatars(sample(data, 4)));
  } catch (error) {
    return serverError(res, 'Unable to load random accounts', error);
  }
}
