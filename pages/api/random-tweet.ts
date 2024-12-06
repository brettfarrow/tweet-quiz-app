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
  reply_to_tweet_id?: string
  reply_to_user_id?: string
  reply_to_username?: string
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

    // Fetch one random tweet using the offset
    const { data, error } = await supabase
      .from('tweets')
      .select(`
        tweet_id,
        account_id,
        created_at,
        full_text,
        retweet_count,
        favorite_count,
        reply_to_tweet_id,
        reply_to_user_id,
        reply_to_username
      `)
      .eq('account_id', account_id)
      .range(randomOffset, randomOffset)
      .limit(1)
      .single()

    if (error) {
      throw new Error(`Error fetching tweet: ${error.message}`)
    }

    if (!data) {
      throw new Error('No tweet retrieved')
    }

    return res.status(200).json(data)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return res.status(500).json({ error: errorMessage })
  }
}
