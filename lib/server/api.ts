import type { NextApiRequest, NextApiResponse } from 'next';

export function allowGet(req: NextApiRequest, res: NextApiResponse): boolean {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') return true;
  res.setHeader('Allow', 'GET');
  res.status(405).json({ error: 'Method not allowed' });
  return false;
}

export function serverError(res: NextApiResponse, context: string, error: unknown) {
  console.error(context, error);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(500).json({ error: 'Unable to load quiz data. Please try again.' });
}
