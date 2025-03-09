import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fabxmporizzqflnftavs.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhYnhtcG9yaXp6cWZsbmZ0YXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIyNDQ5MTIsImV4cCI6MjAzNzgyMDkxMn0.UIEJiUNkLsW28tBHmG-RQDW-I5JNlJLt62CSk9D_qG8'

const supabase = createClient(supabaseUrl, supabaseKey)

type Account = {
  account_id: string
  username: string
  account_display_name: string
  avatar_media_url?: string
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

    // Fetch avatar URLs for each account
    const accountsWithAvatars = await Promise.all(
      randomAccounts.map(async (account) => {
        try {
          const { data: profileData } = await supabase
            .from('profile')
            .select('avatar_media_url')
            .eq('account_id', account.account_id)
            .maybeSingle();

          return {
            ...account,
            avatar_media_url: profileData?.avatar_media_url
          };
        } catch (error) {
          console.error(`Error fetching avatar for account ${account.account_id}:`, error);
          // Return the account without avatar if there's an error
          return account;
        }
      })
    );

    return res.status(200).json(accountsWithAvatars);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return res.status(500).json({ error: errorMessage })
  }
}
