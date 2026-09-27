import { Heart, MessageCircle, Repeat2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/avatar';
import type { Account, Tweet } from '@/lib/types';

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export const CustomTweet = ({ tweet, author }: { tweet: Tweet; author: Account }) => {
  const tweetUrl = `https://x.com/${encodeURIComponent(author.username)}/status/${encodeURIComponent(tweet.tweet_id)}`;
  const profileUrl = `https://x.com/${encodeURIComponent(author.username)}`;
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start space-x-3">
          <Avatar account={author} size={48} />

          <div className="flex-1">
            {/* Author info */}
            <div className="flex items-center space-x-2 text-sm">
              <a
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold hover:underline"
              >
                {author.account_display_name}
              </a>
              <a
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:underline"
              >
                @{author.username}
              </a>
              <span className="text-gray-500">·</span>
              <a
                href={tweetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:underline"
              >
                {formatDate(tweet.created_at)}
              </a>
            </div>

            {/* Tweet content */}
            <a
              href={tweetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-2 text-gray-900 whitespace-pre-wrap hover:underline"
            >
              {tweet.full_text}
            </a>

            {/* Engagement metrics */}
            <div className="mt-4 flex items-center space-x-6 text-gray-500">
              <div className="flex items-center space-x-2 group cursor-not-allowed">
                <div className="p-2 rounded-full group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <span>{formatNumber(tweet.reply_count || 0)}</span>
              </div>
              <div className="flex items-center space-x-2 group cursor-not-allowed">
                <div className="p-2 rounded-full group-hover:bg-green-50 group-hover:text-green-500 transition-colors">
                  <Repeat2 className="h-5 w-5" />
                </div>
                <span>{formatNumber(tweet.retweet_count)}</span>
              </div>
              <div className="flex items-center space-x-2 group cursor-not-allowed">
                <div className="p-2 rounded-full group-hover:bg-red-50 group-hover:text-red-500 transition-colors">
                  <Heart className="h-5 w-5" />
                </div>
                <span>{formatNumber(tweet.favorite_count)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
