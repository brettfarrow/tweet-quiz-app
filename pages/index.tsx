import { useState } from 'react';
import Head from 'next/head';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Check } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar } from '@/components/avatar';
import { CustomTweet } from '@/components/custom-tweet';
import { useQuiz } from '@/hooks/use-quiz';
import { normalizeUsername } from '@/lib/validation';

export default function TweetQuiz() {
  const [username, setUsername] = useState('');
  const normalizedUsername = normalizeUsername(username);
  const {
    currentQuestion, activeUsername, loading, preloading, error, selectedAnswer, stats,
    isCorrect, start, handleGuess, handleNextQuestion, retry,
  } = useQuiz();
  const successRate = stats.total ? ((stats.correct / stats.total) * 100).toFixed(1) : '0';
  const correctAccount = currentQuestion?.accounts.find(
    account => account.account_id === currentQuestion.tweet.account_id,
  );

  return (
    <main className="max-w-2xl mx-auto p-4 space-y-6">
      <Head><title>Guess the Poaster</title><meta name="description" content="Guess who wrote a tweet from the Community Archive." /></Head>
      <Card>
        <CardHeader>
          <CardTitle>Guess the Poaster</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <a className="block text-sm text-gray-800" href="https://www.community-archive.org/" target="_blank" rel="noopener noreferrer">Made possible with data from the <span className="font-semibold text-cyan-600 underline">Community Archive</span></a>

          <form className="space-y-2" onSubmit={(event) => {
            event.preventDefault();
            if (normalizedUsername) void start(normalizedUsername);
          }}>
            <label htmlFor="username" className="block text-sm">Personalize with your mentions</label>
            <input
              id="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter your username"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={16}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex space-x-2">
              <Button type="submit" variant={activeUsername ? "default" : "outline"}
                disabled={!normalizedUsername} aria-pressed={activeUsername !== null}>
                Use Mentions
              </Button>
              <Button type="button" variant={activeUsername ? "outline" : "default"}
                onClick={() => { void start(null); }} aria-pressed={activeUsername === null}>
                Random
              </Button>
            </div>
          </form>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
              <Button className="mt-3" onClick={retry} disabled={loading || preloading}>Retry</Button>
            </Alert>
          )}

          {/* Stats Display */}
          <div className="flex justify-between text-sm text-gray-600">
            <div>
              Success Rate: {successRate}% ({stats.correct}/{stats.total})
            </div>
            {activeUsername && (
              <div className="font-medium text-primary">
                Using mentions for: @{activeUsername}
              </div>
            )}
          </div>

          {/* Tweet Display */}
          {loading ? (
            <div className="p-4 bg-gray-50 rounded-lg flex justify-center">
              <div role="status" className="animate-pulse text-lg">Loading quiz...</div>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-lg whitespace-pre-wrap break-words">{currentQuestion?.tweet?.full_text}</p>
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
                    <Avatar account={account} size={24} />

                    {/* Username with display name if available */}
                    <div className="flex flex-col items-start text-left whitespace-normal break-words min-w-0">
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
              disabled={preloading}
            >
              {preloading ? "Loading next tweet..." : "Next Tweet"}
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
    </main>
  );
}
