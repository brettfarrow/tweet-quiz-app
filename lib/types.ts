export interface Account {
  account_id: string;
  username: string;
  account_display_name: string;
  avatar_media_url?: string | null;
}

export interface Tweet {
  tweet_id: string;
  account_id: string;
  created_at: string;
  full_text: string;
  retweet_count: number;
  favorite_count: number;
  reply_count?: number;
}

export interface Question {
  tweet: Tweet;
  accounts: Account[];
}

export interface AccountResponse {
  data: Account[];
  lastUpdated: string;
}

export interface ApiError {
  error: string;
}
