import { createClient } from '@supabase/supabase-js'
import type { NextApiRequest, NextApiResponse } from 'next'

const supabaseUrl = 'https://fabxmporizzqflnftavs.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhYnhtcG9yaXp6cWZsbmZ0YXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIyNDQ5MTIsImV4cCI6MjAzNzgyMDkxMn0.UIEJiUNkLsW28tBHmG-RQDW-I5JNlJLt62CSk9D_qG8'

const supabase = createClient(supabaseUrl, supabaseKey)

type Tweet = {
  tweet_id: string
  account_id: string
  created_at: string
  full_text: string
  retweet_count: number
  favorite_count: number
  reply_count?: number
  avatar_media_url?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Tweet | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { account_id } = req.query

  if (!account_id || Array.isArray(account_id)) {
    return res.status(400).json({ error: 'Valid account_id is required' })
  }

  try {
    // Directly fetch a random selection of tweets for this account
    // We'll use a combination of approaches to get randomness:
    // 1. Random order
    // 2. Fetch a batch
    // 3. Random selection from that batch
    const BATCH_SIZE = 20;
    
    // First approach: try a random timestamp-based approach
    // This gives us access to the entire tweet history without needing a count
    const sortOptions = ['created_at', 'tweet_id', 'favorite_count', 'retweet_count'];
    const randomSortColumn = sortOptions[Math.floor(Math.random() * sortOptions.length)];
    const randomAscending = Math.random() > 0.5;
    
    let tweetData = null;
    
    // Try the timestamp-based approach first (should work most of the time)
    try {
      // Query using random sorting and a random dice roll to determine which tweets to return
      const { data: randomTweets, error: randomError } = await supabase
        .from('tweets')
        .select('*')
        .eq('account_id', account_id)
        .order(randomSortColumn, { ascending: randomAscending })
        .limit(BATCH_SIZE);
      
      if (randomError) {
        throw randomError;
      }
      
      if (randomTweets && randomTweets.length > 0) {
        // Pick a random tweet from the returned set
        const randomIndex = Math.floor(Math.random() * randomTweets.length);
        tweetData = randomTweets[randomIndex];
      }
    } catch (error) {
      console.warn('First random approach failed, trying backup method:', error);
    }
    
    // If first approach failed, try a different random strategy
    if (!tweetData) {
      try {
        // Simplified approach - just get some tweets and pick one
        const { data: backupTweets, error: backupError } = await supabase
          .from('tweets')
          .select('*')
          .eq('account_id', account_id)
          .limit(50);
        
        if (backupError) {
          throw backupError;
        }
        
        if (!backupTweets || backupTweets.length === 0) {
          return res.status(404).json({ error: 'No tweets found for this account' });
        }
        
        // Pick a random tweet from the returned set
        const randomIndex = Math.floor(Math.random() * backupTweets.length);
        tweetData = backupTweets[randomIndex];
      } catch (error) {
        console.error('Backup tweets fetch error:', error);
        throw new Error(`Error fetching tweets: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // At this point, tweetData should be set or an error thrown
    if (!tweetData) {
      return res.status(404).json({ error: 'No tweets found for this account' });
    }
    
    // Then get the profile data
    const { data: profileData, error: profileError } = await supabase
      .from('profile')
      .select('avatar_media_url')
      .eq('account_id', account_id)
      .maybeSingle();

    if (profileError) {
      console.error('Profile error details:', JSON.stringify(profileError));
      // Continue without profile data - this is non-fatal
    }

    // Combine the data
    const transformedTweet: Tweet = {
      tweet_id: tweetData.tweet_id,
      account_id: tweetData.account_id,
      created_at: tweetData.created_at,
      full_text: tweetData.full_text,
      retweet_count: tweetData.retweet_count,
      favorite_count: tweetData.favorite_count,
      reply_count: tweetData.reply_count,
      avatar_media_url: profileData?.avatar_media_url
    };

    return res.status(200).json(transformedTweet);
  } catch (error) {
    console.error('API error:', error);
    let errorMessage = 'Unknown error occurred';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      try {
        errorMessage = JSON.stringify(error);
      } catch {
        errorMessage = 'Error object could not be stringified';
      }
    }
    
    return res.status(500).json({ error: errorMessage });
  }
}
