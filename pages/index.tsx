/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Check, Heart, MessageCircle, Repeat2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { fetchWithRetry } from '../utils/fetch';

type Account = {
  account_id: string;
  username: string;
  account_display_name: string;
}

type Tweet = {
  tweet_id: string;
  account_id: string;
  created_at: string;
  full_text: string;
  retweet_count: number;
  favorite_count: number;
  reply_count?: number;
  avatar_media_url?: string;
}

type Question = {
  tweet: Tweet;
  accounts: Account[];
}

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

const CustomTweet = ({ tweet, author }: { tweet: Tweet; author: Account }) => {
  const tweetUrl = `https://x.com/${author.username}/status/${tweet.tweet_id}`;
  const profileUrl = `https://x.com/${author.username}`;
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start space-x-3">
          {/* Avatar */}
          {tweet.avatar_media_url ? (
            <img 
              src={tweet.avatar_media_url} 
              alt={`${author.username}'s avatar`}
              className="w-12 h-12 rounded-full flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0" />
          )}
          
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

const TweetQuiz = () => {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [nextQuestion, setNextQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [stats, setStats] = useState({ correct: 0, total: 0 });

  useEffect(() => {
    const savedStats = localStorage.getItem('tweetQuizStats');
    if (savedStats) {
      setStats(JSON.parse(savedStats));
    }
  }, []);

  const updateStats = (correct: boolean) => {
    const newStats = {
      correct: stats.correct + (correct ? 1 : 0),
      total: stats.total + 1
    };
    setStats(newStats);
    localStorage.setItem('tweetQuizStats', JSON.stringify(newStats));
  };

  const fetchQuestion = async () => {
    try {
      const accounts = await fetchWithRetry<Account[]>('/api/random-accounts', {
        retries: 3,
        retryDelay: 1000
      });

      const randomAccount = accounts[Math.floor(Math.random() * accounts.length)];
      const tweet = await fetchWithRetry<Tweet>(`/api/random-tweet?account_id=${randomAccount.account_id}`, {
        retries: 3,
        retryDelay: 1000
      });

      return {
        tweet,
        accounts
      };
    } catch (error) {
      console.error('Error fetching question:', error);
      setError(error instanceof Error ? error.message : 'Failed to load quiz data');
      throw error;
    }
  };

  useEffect(() => {
    const initializeQuestions = async () => {
      try {
        const firstQuestion = await fetchQuestion();
        setCurrentQuestion(firstQuestion);
        const secondQuestion = await fetchQuestion();
        setNextQuestion(secondQuestion);
      } catch (error) {
        console.error('Error initializing questions:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeQuestions();
  }, []);

  const preloadNextQuestion = async () => {
    try {
      const newQuestion = await fetchQuestion();
      setNextQuestion(newQuestion);
    } catch (error) {
      console.error('Error preloading next question:', error);
    }
  };

  const handleNextQuestion = () => {
    setCurrentQuestion(nextQuestion);
    setSelectedAnswer(null);
    setIsCorrect(null);
    preloadNextQuestion();
  };

  const handleGuess = (accountId: string) => {
    if (!currentQuestion) return;
    
    const correct = accountId === currentQuestion.tweet.account_id;
    setSelectedAnswer(accountId);
    setIsCorrect(correct);
    updateStats(correct);
  };

  const getSuccessRate = () => {
    if (stats.total === 0) return 0;
    return ((stats.correct / stats.total) * 100).toFixed(1);
  };

  if (error) {
    return (
      <div className="flex justify-center items-center h-64 flex-col gap-4">
        <div className="text-red-500">{error}</div>
        <Button onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  if (loading || !currentQuestion) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-pulse text-lg">Loading quiz...</div>
      </div>
    );
  }

  const correctAccount = currentQuestion.accounts.find(
    account => account.account_id === currentQuestion.tweet.account_id
  );

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Guess the Poaster</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <a className="block text-sm text-gray-800" href="https://www.community-archive.org/" target="_blank" rel="noopener noreferrer">Made possible with data from the <span className="font-semibold text-cyan-600 underline">Community Archive</span></a>
          {/* Stats Display */}
          <div className="text-sm text-gray-600">
            Success Rate: {getSuccessRate()}% ({stats.correct}/{stats.total})
          </div>

          {/* Tweet Display */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-lg">{currentQuestion.tweet.full_text}</p>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 gap-3">
            {currentQuestion.accounts.map((account) => (
              <Button
                key={account.account_id}
                onClick={() => handleGuess(account.account_id)}
                disabled={selectedAnswer !== null}
                variant={
                  selectedAnswer === null ? "outline" :
                  account.account_id === currentQuestion.tweet.account_id ? "default" :
                  account.account_id === selectedAnswer ? "destructive" : "outline"
                }
                className="w-full justify-start h-12"
              >
                {account.username}
                {selectedAnswer !== null && account.account_id === currentQuestion.tweet.account_id && (
                  <Check className="ml-2 h-4 w-4" />
                )}
              </Button>
            ))}
          </div>

          {/* Feedback Alert */}
          {selectedAnswer !== null && (
            <Alert variant={isCorrect ? "default" : "destructive"}>
              {isCorrect ? (
                <Check className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {isCorrect ? "Correct!" : "Incorrect!"}
              </AlertDescription>
            </Alert>
          )}

          {/* Next Question Button */}
          {selectedAnswer !== null && (
            <Button 
              onClick={handleNextQuestion}
              className="w-full"
              disabled={!nextQuestion}
            >
              Next Tweet
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Custom Tweet Display */}
      {selectedAnswer !== null && correctAccount && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Original Tweet</h2>
          <CustomTweet 
            tweet={currentQuestion.tweet}
            author={correctAccount}
          />
        </div>
      )}
    </div>
  );
};

export default TweetQuiz;