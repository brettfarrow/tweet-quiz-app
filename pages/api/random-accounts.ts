import type { NextApiRequest, NextApiResponse } from 'next'

type Account = {
  account_id: string
  username: string
  account_display_name: string
}

type CachedResponse = {
  data: Account[]
  lastUpdated: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Account[] | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get all accounts from our cached endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/accounts`);
    if (!response.ok) {
      throw new Error(`Error fetching accounts: ${response.statusText}`);
    }

    const { data: accounts }: CachedResponse = await response.json();

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts retrieved');
    }

    // Select 4 random accounts
    const randomAccounts: Account[] = [];
    const accountsCopy = [...accounts];

    // Fisher-Yates shuffle to get 4 random accounts
    for (let i = 0; i < 4 && accountsCopy.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * accountsCopy.length);
      randomAccounts.push(accountsCopy[randomIndex]);
      accountsCopy.splice(randomIndex, 1);
    }

    return res.status(200).json(randomAccounts);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return res.status(500).json({ error: errorMessage })
  }
}