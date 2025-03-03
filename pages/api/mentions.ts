import { createClient } from '@supabase/supabase-js'
import type { NextApiRequest, NextApiResponse } from 'next'

const supabaseUrl = 'https://fabxmporizzqflnftavs.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhYnhtcG9yaXp6cWZsbmZ0YXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIyNDQ5MTIsImV4cCI6MjAzNzgyMDkxMn0.UIEJiUNkLsW28tBHmG-RQDW-I5JNlJLt62CSk9D_qG8'

const supabase = createClient(supabaseUrl, supabaseKey)

type Tweet = {
  tweet_id: string;
  account_id: string;
  full_text: string;
  account: {
    username: string;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<string[] | { error: string }>
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
            username
          )
        )
      `)
      .eq('mentioned_user_id', userData.user_id)
      .order('tweet_id', { ascending: false })
      .limit(100)

    if (mentionError) {
      throw mentionError
    }

    // Extract unique author usernames
    const authorUsernames = new Set(
      mentionData
        ?.flatMap(mention => {
          // @ts-expect-error come back to this type
          const tweet: Tweet = mention.tweets;
          return tweet?.account?.username ? [tweet.account.username] : [];
        }) || []
    )

    return res.status(200).json(Array.from(authorUsernames))
  } catch (error) {
    console.error('Error:', error)
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    })
  }
}