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
  avatar_media_url?: string;
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
  const [username, setUsername] = useState<string>('');
  const [usingMentions, setUsingMentions] = useState<boolean>(false);
  // Keep track of already seen tweets to avoid repeats
  const [seenTweetIds, setSeenTweetIds] = useState<Set<string>>(new Set());

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
      let accounts;
      if (usingMentions && username) {
        accounts = await fetchWithRetry<Account[]>(`/api/mentions?username=${username}`, {
          retries: 3,
          retryDelay: 1000
        });
        
        if (!accounts || accounts.length === 0) {
          setError('No mentions found for this username. Try another username or use random accounts.');
          throw new Error('No mentions found');
        }
      } else {
        accounts = await fetchWithRetry<Account[]>('/api/random-accounts', {
          retries: 3,
          retryDelay: 1000
        });
        
        if (!accounts || accounts.length === 0) {
          setError('Failed to fetch random accounts. Please try again.');
          throw new Error('No random accounts found');
        }
      }

      // Safety check to ensure we have valid accounts with account_id
      const validAccounts = accounts.filter(account => account && account.account_id);
      
      if (validAccounts.length === 0) {
        setError('No valid accounts found. Please try again.');
        throw new Error('No valid accounts found');
      }

      const randomAccount = validAccounts[Math.floor(Math.random() * validAccounts.length)];
      
      if (!randomAccount || !randomAccount.account_id) {
        setError('Invalid account selected. Please try again.');
        throw new Error('Invalid account selected');
      }
      
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
        if (firstQuestion && firstQuestion.tweet) {
          setCurrentQuestion(firstQuestion);
        }
        
        const secondQuestion = await fetchQuestion();
        if (secondQuestion && secondQuestion.tweet) {
          setNextQuestion(secondQuestion);
        }
      } catch (error) {
        console.error('Error initializing questions:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeQuestions();
    // We intentionally only want this to run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const preloadNextQuestion = async () => {
    try {
      if (usingMentions && username) {
        // Fetch accounts from mentions API
        const mentionAccounts = await fetchWithRetry<Account[]>(`/api/mentions?username=${username}`, {
          retries: 3,
          retryDelay: 1000
        });
        
        if (!mentionAccounts || mentionAccounts.length === 0) {
          setError('No mentions found for this username. Try another username or use random accounts.');
          return;
        }
        
        // Try to get a new tweet that we haven't seen before (up to 10 attempts)
        let tweet: Tweet | null = null;
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
          try {
            // Get a random account from the mentions
            const randomAccount = mentionAccounts[Math.floor(Math.random() * mentionAccounts.length)];
            
            // Fetch a tweet for this account
            const fetchedTweet = await fetch(`/api/random-tweet?account_id=${randomAccount.account_id}`);
            
            // Check for HTTP error responses
            if (!fetchedTweet.ok) {
              const errorText = await fetchedTweet.text();
              console.warn(`Error fetching tweet: ${errorText}`);
              attempts++;
              continue; // Try again with a different account
            }
            
            const tweetData = await fetchedTweet.json();
            
            // Check if the response contains an error message
            if (tweetData.error) {
              console.warn(`API returned error: ${tweetData.error}`);
              attempts++;
              continue; // Try again with a different account
            }
            
            // Check if we've seen this tweet before
            if (!seenTweetIds.has(tweetData.tweet_id)) {
              tweet = tweetData;
              break;
            }
          } catch (error) {
            console.warn(`Error fetching tweet: ${error}`);
          }
          
          attempts++;
          
          // If we've tried many times and still can't find a new tweet,
          // consider resetting the seen tweets after a certain number of attempts
          if (attempts === maxAttempts - 2) {
            console.log('Too many seen tweets, clearing history...');
            setSeenTweetIds(new Set());
          }
        }
        
        if (!tweet) {
          // If all attempts failed, try once more but don't use fetchWithRetry
          // to make sure we properly check for error responses
          try {
            const randomAccount = mentionAccounts[Math.floor(Math.random() * mentionAccounts.length)];
            const response = await fetch(`/api/random-tweet?account_id=${randomAccount.account_id}`);
            
            if (!response.ok) {
              throw new Error(`HTTP error: ${response.status}`);
            }
            
            const data = await response.json();
            if (data.error) {
              throw new Error(`API error: ${data.error}`);
            }
            
            tweet = data;
          } catch (error) {
            // Last resort - construct a fallback tweet
            console.error('Failed to get any valid tweet, using fallback:', error);
            tweet = {
              tweet_id: 'fallback-' + Date.now(),
              account_id: mentionAccounts[0].account_id,
              created_at: new Date().toISOString(),
              full_text: 'Sorry, we couldn\'t get a tweet for this user. Please try again or pick a different user.',
              retweet_count: 0,
              favorite_count: 0,
              reply_count: 0
            };
          }
        }
        
        // Only create a question if tweet is not null
        if (tweet) {
          const newQuestion: Question = {
            tweet,
            accounts: mentionAccounts
          };
          
          setNextQuestion(newQuestion);
        } else {
          // If we couldn't get a valid tweet, don't update the next question
          console.warn('Failed to get a valid tweet for next question');
        }
      } else {
        // Fetch random accounts
        const randomAccounts = await fetchWithRetry<Account[]>('/api/random-accounts', {
          retries: 3,
          retryDelay: 1000
        });
        
        if (!randomAccounts || randomAccounts.length === 0) {
          setError('Failed to fetch random accounts. Please try again.');
          return;
        }
        
        // Try to get a new tweet that we haven't seen before (up to 10 attempts)
        let tweet: Tweet | null = null;
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
          try {
            // Get a random account
            const randomAccount = randomAccounts[Math.floor(Math.random() * randomAccounts.length)];
            
            // Fetch a tweet for this account
            const fetchedTweet = await fetch(`/api/random-tweet?account_id=${randomAccount.account_id}`);
            
            // Check for HTTP error responses
            if (!fetchedTweet.ok) {
              const errorText = await fetchedTweet.text();
              console.warn(`Error fetching tweet: ${errorText}`);
              attempts++;
              continue; // Try again with a different account
            }
            
            const tweetData = await fetchedTweet.json();
            
            // Check if the response contains an error message
            if (tweetData.error) {
              console.warn(`API returned error: ${tweetData.error}`);
              attempts++;
              continue; // Try again with a different account
            }
            
            // Check if we've seen this tweet before
            if (!seenTweetIds.has(tweetData.tweet_id)) {
              tweet = tweetData;
              break;
            }
          } catch (error) {
            console.warn(`Error fetching tweet: ${error}`);
          }
          
          attempts++;
          
          // If we've tried many times and still can't find a new tweet,
          // consider resetting the seen tweets after a certain number of attempts
          if (attempts === maxAttempts - 2) {
            console.log('Too many seen tweets, clearing history...');
            setSeenTweetIds(new Set());
          }
        }
        
        if (!tweet) {
          // If all attempts failed, try once more but don't use fetchWithRetry
          // to make sure we properly check for error responses
          try {
            const randomAccount = randomAccounts[Math.floor(Math.random() * randomAccounts.length)];
            const response = await fetch(`/api/random-tweet?account_id=${randomAccount.account_id}`);
            
            if (!response.ok) {
              throw new Error(`HTTP error: ${response.status}`);
            }
            
            const data = await response.json();
            if (data.error) {
              throw new Error(`API error: ${data.error}`);
            }
            
            tweet = data;
          } catch (error) {
            // Last resort - construct a fallback tweet
            console.error('Failed to get any valid tweet, using fallback:', error);
            tweet = {
              tweet_id: 'fallback-' + Date.now(),
              account_id: randomAccounts[0].account_id,
              created_at: new Date().toISOString(),
              full_text: 'Sorry, we couldn\'t get a tweet for this account. Please try again.',
              retweet_count: 0,
              favorite_count: 0,
              reply_count: 0
            };
          }
        }
        
        // Only create a question if tweet is not null
        if (tweet) {
          const newQuestion: Question = {
            tweet,
            accounts: randomAccounts
          };
          
          setNextQuestion(newQuestion);
        } else {
          // If we couldn't get a valid tweet, don't update the next question
          console.warn('Failed to get a valid tweet for next question');
        }
      }
    } catch (error) {
      console.error('Error preloading next question:', error);
    }
  };

  const handleNextQuestion = () => {
    // Add current tweet ID to the set of seen tweets to avoid repetition
    if (currentQuestion?.tweet?.tweet_id) {
      setSeenTweetIds(prev => {
        const newSet = new Set(prev);
        newSet.add(currentQuestion.tweet.tweet_id);
        return newSet;
      });
    }
    
    setCurrentQuestion(nextQuestion);
    setSelectedAnswer(null);
    setIsCorrect(null);
    preloadNextQuestion();
  };

  const handleGuess = (accountId: string) => {
    if (!currentQuestion || loading) return;
    
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
        <div className="flex space-x-2">
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
            <Button 
              variant={usingMentions ? "default" : "outline"}
              onClick={() => {
                if (!username.trim() || usingMentions) return; // Don't do anything if already active or no username
                
                // Immediately clear cache and switch to mentions mode
                setUsingMentions(true);
                setError(null);
                setLoading(true);
                // Clear seen tweets when switching modes
                setSeenTweetIds(new Set());
                
                // Define a separate function to fetch with mentions
                const fetchWithMentions = async () => {
                  try {
                    // First fetch accounts from mentions API
                    const mentionAccounts = await fetchWithRetry<Account[]>(`/api/mentions?username=${username}`, {
                      retries: 3,
                      retryDelay: 1000
                    });
                    
                    if (!mentionAccounts || mentionAccounts.length === 0) {
                      setError('No mentions found for this username. Try another username or use random accounts.');
                      setLoading(false);
                      return;
                    }
                    
                    // Get a random account from the mentions
                    const randomAccount = mentionAccounts[Math.floor(Math.random() * mentionAccounts.length)];
                    
                    // Directly fetch a tweet for this account
                    const tweet = await fetchWithRetry<Tweet>(`/api/random-tweet?account_id=${randomAccount.account_id}`, {
                      retries: 3,
                      retryDelay: 1000
                    });
                    
                    // Create the first question directly
                    const firstQuestion: Question = {
                      tweet,
                      accounts: mentionAccounts
                    };
                    
                    setCurrentQuestion(firstQuestion);
                    
                    // Then create a second question (also from mentions)
                    const randomAccount2 = mentionAccounts[Math.floor(Math.random() * mentionAccounts.length)];
                    const tweet2 = await fetchWithRetry<Tweet>(`/api/random-tweet?account_id=${randomAccount2.account_id}`, {
                      retries: 3,
                      retryDelay: 1000
                    });
                    
                    const secondQuestion: Question = {
                      tweet: tweet2,
                      accounts: mentionAccounts
                    };
                    
                    setNextQuestion(secondQuestion);
                  } catch (error) {
                    console.error('Error initializing questions with mentions:', error);
                  } finally {
                    setLoading(false);
                  }
                };
                
                fetchWithMentions();
              }}
              disabled={!username.trim()}
            >
              Use Mentions
            </Button>
            
            <Button 
              variant={!usingMentions ? "default" : "outline"}
              onClick={() => {
                if (!usingMentions) return; // Don't do anything if already active
                
                // Immediately clear cache and switch to random mode
                setUsingMentions(false);
                setError(null);
                setLoading(true);
                // Clear seen tweets when switching modes
                setSeenTweetIds(new Set());
                
                // Define a separate function to fetch with random accounts
                const fetchWithRandomAccounts = async () => {
                  try {
                    // First fetch random accounts
                    const randomAccounts = await fetchWithRetry<Account[]>('/api/random-accounts', {
                      retries: 3,
                      retryDelay: 1000
                    });
                    
                    if (!randomAccounts || randomAccounts.length === 0) {
                      setError('Failed to fetch random accounts. Please try again.');
                      setLoading(false);
                      return;
                    }
                    
                    // Get a random account
                    const randomAccount = randomAccounts[Math.floor(Math.random() * randomAccounts.length)];
                    
                    // Directly fetch a tweet for this account
                    const tweet = await fetchWithRetry<Tweet>(`/api/random-tweet?account_id=${randomAccount.account_id}`, {
                      retries: 3,
                      retryDelay: 1000
                    });
                    
                    // Create the first question directly
                    const firstQuestion: Question = {
                      tweet,
                      accounts: randomAccounts
                    };
                    
                    setCurrentQuestion(firstQuestion);
                    
                    // Then create a second question
                    const randomAccount2 = randomAccounts[Math.floor(Math.random() * randomAccounts.length)];
                    const tweet2 = await fetchWithRetry<Tweet>(`/api/random-tweet?account_id=${randomAccount2.account_id}`, {
                      retries: 3,
                      retryDelay: 1000
                    });
                    
                    const secondQuestion: Question = {
                      tweet: tweet2,
                      accounts: randomAccounts
                    };
                    
                    setNextQuestion(secondQuestion);
                  } catch (error) {
                    console.error('Error initializing questions with random accounts:', error);
                  } finally {
                    setLoading(false);
                  }
                };
                
                fetchWithRandomAccounts();
              }}
            >
              Random
            </Button>
        </div>
      </div>
    );
  }

  /* 
   * We no longer return early for loading 
   * Instead we'll show a loading state in each section
   */
  
  // Find correct account if we have a current question
  const correctAccount = currentQuestion?.accounts?.find(
    account => account?.account_id === currentQuestion?.tweet?.account_id
  );

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Guess the Poaster</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <a className="block text-sm text-gray-800" href="https://www.community-archive.org/" target="_blank" rel="noopener noreferrer">Made possible with data from the <span className="font-semibold text-cyan-600 underline">Community Archive</span></a>
          
          {/* Username input and mode toggle buttons */}
          <div className="space-y-2">
            <div className="flex space-x-2">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username to personalize with your mentions"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex space-x-2">
              <Button 
                variant={usingMentions ? "default" : "outline"}
                onClick={() => {
                  if (!username.trim() || usingMentions) return; // Don't do anything if already active or no username
                  
                  // Immediately clear cache and switch to mentions mode
                  setUsingMentions(true);
                  setLoading(true);
                  setCurrentQuestion(null);
                  setNextQuestion(null);
                  setSelectedAnswer(null);
                  setIsCorrect(null);
                  setError(null);
                  // Clear seen tweets when switching modes
                  setSeenTweetIds(new Set());
                  
                  // Define a separate function to fetch with mentions
                  const fetchWithMentions = async () => {
                    try {
                      // First fetch accounts from mentions API
                      const mentionAccounts = await fetchWithRetry<Account[]>(`/api/mentions?username=${username}`, {
                        retries: 3,
                        retryDelay: 1000
                      });
                      
                      if (!mentionAccounts || mentionAccounts.length === 0) {
                        setError('No mentions found for this username. Try another username or use random accounts.');
                        setLoading(false);
                        return;
                      }
                      
                      // Get a random account from the mentions
                      const randomAccount = mentionAccounts[Math.floor(Math.random() * mentionAccounts.length)];
                      
                      // Directly fetch a tweet for this account
                      const tweet = await fetchWithRetry<Tweet>(`/api/random-tweet?account_id=${randomAccount.account_id}`, {
                        retries: 3,
                        retryDelay: 1000
                      });
                      
                      // Create the first question directly
                      const firstQuestion = {
                        tweet,
                        accounts: mentionAccounts
                      };
                      
                      setCurrentQuestion(firstQuestion);
                      
                      // Then create a second question (also from mentions)
                      const randomAccount2 = mentionAccounts[Math.floor(Math.random() * mentionAccounts.length)];
                      const tweet2 = await fetchWithRetry<Tweet>(`/api/random-tweet?account_id=${randomAccount2.account_id}`, {
                        retries: 3,
                        retryDelay: 1000
                      });
                      
                      const secondQuestion = {
                        tweet: tweet2,
                        accounts: mentionAccounts
                      };
                      
                      setNextQuestion(secondQuestion);
                    } catch (error) {
                      console.error('Error initializing questions with mentions:', error);
                    } finally {
                      setLoading(false);
                    }
                  };
                  
                  fetchWithMentions();
                }}
                disabled={!username.trim()}
                className="whitespace-nowrap"
              >
                Use Mentions
              </Button>
              
              <Button 
                variant={!usingMentions ? "default" : "outline"}
                onClick={() => {
                  if (!usingMentions) return; // Don't do anything if already active
                  
                  // Immediately clear cache and switch to random mode
                  setUsingMentions(false);
                  setLoading(true);
                  setCurrentQuestion(null);
                  setNextQuestion(null);
                  setSelectedAnswer(null);
                  setIsCorrect(null);
                  setError(null);
                  // Clear seen tweets when switching modes
                  setSeenTweetIds(new Set());
                  
                  // Define a separate function to fetch with random accounts
                  const fetchWithRandomAccounts = async () => {
                    try {
                      // First fetch random accounts
                      const randomAccounts = await fetchWithRetry<Account[]>('/api/random-accounts', {
                        retries: 3,
                        retryDelay: 1000
                      });
                      
                      if (!randomAccounts || randomAccounts.length === 0) {
                        setError('Failed to fetch random accounts. Please try again.');
                        setLoading(false);
                        return;
                      }
                      
                      // Get a random account
                      const randomAccount = randomAccounts[Math.floor(Math.random() * randomAccounts.length)];
                      
                      // Directly fetch a tweet for this account
                      const tweet = await fetchWithRetry<Tweet>(`/api/random-tweet?account_id=${randomAccount.account_id}`, {
                        retries: 3,
                        retryDelay: 1000
                      });
                      
                      // Create the first question directly
                      const firstQuestion = {
                        tweet,
                        accounts: randomAccounts
                      };
                      
                      setCurrentQuestion(firstQuestion);
                      
                      // Then create a second question
                      const randomAccount2 = randomAccounts[Math.floor(Math.random() * randomAccounts.length)];
                      const tweet2 = await fetchWithRetry<Tweet>(`/api/random-tweet?account_id=${randomAccount2.account_id}`, {
                        retries: 3,
                        retryDelay: 1000
                      });
                      
                      const secondQuestion = {
                        tweet: tweet2,
                        accounts: randomAccounts
                      };
                      
                      setNextQuestion(secondQuestion);
                    } catch (error) {
                      console.error('Error initializing questions with random accounts:', error);
                    } finally {
                      setLoading(false);
                    }
                  };
                  
                  fetchWithRandomAccounts();
                }}
              >
                Random
              </Button>
            </div>
          </div>
          
          {/* Stats Display */}
          <div className="flex justify-between text-sm text-gray-600">
            <div>
              Success Rate: {getSuccessRate()}% ({stats.correct}/{stats.total})
            </div>
            {usingMentions && username && (
              <div className="font-medium text-primary">
                Using mentions for: @{username}
              </div>
            )}
          </div>

          {/* Tweet Display */}
          {loading ? (
            <div className="p-4 bg-gray-50 rounded-lg flex justify-center">
              <div className="animate-pulse text-lg">Loading quiz...</div>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-lg">{currentQuestion?.tweet?.full_text}</p>
            </div>
          )}

          {/* Options */}
          {loading ? (
            <div className="grid grid-cols-1 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-full h-auto min-h-[3rem] animate-pulse bg-gray-200 rounded-md flex items-center px-3 py-2">
                  <div className="w-6 h-6 rounded-full animate-pulse bg-gray-300 mr-2"></div>
                  <div className="flex-1">
                    <div className="h-3 w-32 animate-pulse bg-gray-300 rounded mb-1"></div>
                    <div className="h-3 w-20 animate-pulse bg-gray-300 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {currentQuestion?.accounts?.map((account) => {
                // Check if this is the correct account
                const isCorrectAccount = account.account_id === currentQuestion?.tweet?.account_id;
                
                // Generate an initial for the avatar
                const initial = account.username.charAt(0).toUpperCase();
                
                // Generate a consistent color based on the username
                const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 
                               'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];
                const colorIndex = account.username.length % colors.length;
                const bgColor = colors[colorIndex];
                
                return (
                  <Button
                    key={account.account_id}
                    onClick={() => handleGuess(account.account_id)}
                    disabled={selectedAnswer !== null}
                    variant={
                      selectedAnswer === null ? "outline" :
                      isCorrectAccount ? "default" :
                      account.account_id === selectedAnswer ? "destructive" : "outline"
                    }
                    className="w-full justify-start h-auto min-h-[3rem] py-2 px-3"
                  >
                    {/* Avatar - always show profile image when available */}
                    {account.avatar_media_url ? (
                      <img 
                        src={account.avatar_media_url} 
                        alt={`${account.username}'s avatar`}
                        className="w-6 h-6 rounded-full mr-2 flex-shrink-0"
                      />
                    ) : (
                      <div className={`w-6 h-6 rounded-full ${bgColor} mr-2 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold`}>
                        {initial}
                      </div>
                    )}
                    
                    {/* Username with display name if available */}
                    <div className="flex flex-col items-start">
                      {account.account_display_name && account.account_display_name !== account.username && (
                        <span className="text-xs leading-tight">{account.account_display_name}</span>
                      )}
                      <span className="leading-tight text-gray-600">@{account.username}</span>
                    </div>
                    
                    {/* Check mark for correct answer */}
                    {selectedAnswer !== null && isCorrectAccount && (
                      <Check className="ml-auto h-4 w-4" />
                    )}
                  </Button>
                );
              })}
            </div>
          )}

          {/* Feedback Alert */}
          {!loading && selectedAnswer !== null && (
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
          {!loading && selectedAnswer !== null && (
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
      {!loading && selectedAnswer !== null && correctAccount && currentQuestion && (
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