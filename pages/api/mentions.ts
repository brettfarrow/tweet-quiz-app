import type { NextApiRequest, NextApiResponse } from 'next'
import supabase from '@/utils/supabase'

// Define the shape of the tweets we'll be handling
type MentionTweet = {
  tweets: {
    tweet_id: string;
    account_id: string;
    account: {
      username: string;
      account_id: string;
    };
  };
};

type Account = {
  account_id: string;
  username: string;
  account_display_name: string;
  avatar_media_url?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Account[] | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let { username } = req.query
  if (!username || Array.isArray(username)) {
    return res.status(400).json({ error: 'Username is required' })
  }

  // Remove @ if present
  username = username.replace('@', '')

  try {
    // First get the mentioned user
    const { data: userData, error: userError } = await supabase
      .from('mentioned_users')
      .select('user_id')
      .eq('screen_name', username)
      .single()

    if (userError) {
      throw userError
    }

    if (!userData) {
      return res.status(200).json([])
    }

    // Then get mentions and join with tweets and account
    const { data: mentionData, error: mentionError } = await supabase
      .from('user_mentions')
      .select(`
        tweets (
          tweet_id,
          account_id,
          account:account (
            username,
            account_id
          )
        )
      `)
      .eq('mentioned_user_id', userData.user_id)
      .order('tweet_id', { ascending: false })
      .limit(100)

    if (mentionError) {
      throw mentionError
    }

    // Extract unique account IDs and usernames
    const uniqueAccounts = new Map<string, Account>();
    
    mentionData?.forEach(mention => {
      // Cast mention to the correct type
      const mentionTyped = mention as unknown as MentionTweet;
      const tweet = mentionTyped.tweets;
      
      if (tweet?.account?.username && tweet?.account?.account_id) {
        if (!uniqueAccounts.has(tweet.account.account_id)) {
          uniqueAccounts.set(tweet.account.account_id, {
            account_id: tweet.account.account_id,
            username: tweet.account.username,
            account_display_name: tweet.account.username // Use username as display name if not available
          });
        }
      }
    });

    // If we have at least 4 accounts, select 4 random ones
    let accountsArray = Array.from(uniqueAccounts.values());
    
    if (accountsArray.length === 0) {
      return res.status(200).json([]);
    }
    
    if (accountsArray.length > 4) {
      // Select 4 random accounts (Fisher-Yates shuffle)
      const randomAccounts: Account[] = [];
      const accountsCopy = [...accountsArray];
      
      for (let i = 0; i < 4 && accountsCopy.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * accountsCopy.length);
        randomAccounts.push(accountsCopy[randomIndex]);
        accountsCopy.splice(randomIndex, 1);
      }
      
      accountsArray = randomAccounts;
    }

    // Fetch avatar URLs for each account
    const accountsWithAvatars = await Promise.all(
      accountsArray.map(async (account) => {
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
    console.error('Error:', error)
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    })
  }
}