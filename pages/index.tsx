import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Check } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
}

type Question = {
  tweet: Tweet;
  accounts: Account[];
}

const TweetQuiz = () => {
  // Separate state for current and next questions
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [nextQuestion, setNextQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [stats, setStats] = useState({ correct: 0, total: 0 });

  useEffect(() => {
    // Load stats from localStorage on component mount
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
      // First get 4 random accounts
      const accountsResponse = await fetch('/api/random-accounts');
      const accounts: Account[] = await accountsResponse.json();

      // Get a random tweet from one of these accounts
      const randomAccount = accounts[Math.floor(Math.random() * accounts.length)];
      const tweetResponse = await fetch(`/api/random-tweet?account_id=${randomAccount.account_id}`);
      
      if (!tweetResponse.ok) {
        throw new Error('Failed to fetch tweet');
      }
      
      const tweet: Tweet = await tweetResponse.json();

      return {
        tweet,
        accounts
      };
    } catch (error) {
      console.error('Error fetching question:', error);
      throw error;
    }
  };

  // Load both current and next questions on initial mount
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

  // Function to preload next question in the background
  const preloadNextQuestion = async () => {
    try {
      const newQuestion = await fetchQuestion();
      setNextQuestion(newQuestion);
    } catch (error) {
      console.error('Error preloading next question:', error);
    }
  };

  const handleNextQuestion = () => {
    // Move next question to current
    setCurrentQuestion(nextQuestion);
    // Reset UI state
    setSelectedAnswer(null);
    setIsCorrect(null);
    // Start loading new next question
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

  if (loading || !currentQuestion) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-pulse text-lg">Loading quiz...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Who Tweeted This?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
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
                  account.account_id === currentQuestion.tweet.account_id ? "secondary" :
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
                {isCorrect ? "Correct!" : "Incorrect! Try another one!"}
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
    </div>
  );
};

export default TweetQuiz;
