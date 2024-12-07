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
    // First, get the total count of tweets for this account
    const { count, error: countError } = await supabase
      .from('tweets')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', account_id)

    if (countError) {
      throw new Error(`Error getting count: ${countError.message}`)
    }

    if (!count || count === 0) {
      return res.status(404).json({ error: 'No tweets found for this account' })
    }

    // Generate a random offset
    const randomOffset = Math.floor(Math.random() * count)

    // First get the random tweet
    const { data: tweetData, error: tweetError } = await supabase
      .from('tweets')
      .select('*')
      .eq('account_id', account_id)
      .range(randomOffset, randomOffset)
      .single()

    if (tweetError) {
      throw new Error(`Error fetching tweet: ${tweetError.message}`)
    }

    if (!tweetData) {
      throw new Error('No tweet retrieved')
    }

    // Then get the profile data
    const { data: profileData, error: profileError } = await supabase
      .from('profile')
      .select('avatar_media_url')
      .eq('account_id', account_id)
      .maybeSingle()

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      // Continue without profile data
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

    return res.status(200).json(transformedTweet)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return res.status(500).json({ error: errorMessage })
  }
}
