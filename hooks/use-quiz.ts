import { useCallback, useEffect, useRef, useState } from 'react';
import type { Question } from '@/lib/types';
import { EMPTY_STATS, fetchQuestion, readStats, saveStats } from '@/lib/quiz';

type Session = {
  controller: AbortController;
  username: string | null;
  seen: Set<string>;
  next: Question | null;
  preloading: boolean;
  answered: boolean;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to load quiz data. Please try again.';
}

export function useQuiz() {
  const sessionRef = useRef<Session | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [activeUsername, setActiveUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [preloading, setPreloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [stats, setStats] = useState(EMPTY_STATS);
  const statsRef = useRef(EMPTY_STATS);

  const preload = useCallback(async (session: Session) => {
    if (session.preloading || session.controller.signal.aborted) return;
    session.preloading = true;
    setPreloading(true);
    setError(null);
    try {
      const question = await fetchQuestion(session.username, session.seen, session.controller.signal);
      if (!session.controller.signal.aborted) session.next = question;
    } catch (error) {
      if (!session.controller.signal.aborted) setError(errorMessage(error));
    } finally {
      session.preloading = false;
      if (!session.controller.signal.aborted) setPreloading(false);
    }
  }, []);

  const start = useCallback(async (username: string | null) => {
    sessionRef.current?.controller.abort();
    const session: Session = {
      controller: new AbortController(), username, seen: new Set(),
      next: null, preloading: false, answered: false,
    };
    sessionRef.current = session;
    setActiveUsername(username);
    setCurrentQuestion(null);
    setSelectedAnswer(null);
    setError(null);
    setLoading(true);
    setPreloading(false);
    try {
      const question = await fetchQuestion(username, session.seen, session.controller.signal);
      if (session.controller.signal.aborted) return;
      session.seen.add(question.tweet.tweet_id);
      setCurrentQuestion(question);
      setLoading(false);
      void preload(session);
    } catch (error) {
      if (!session.controller.signal.aborted) {
        setError(errorMessage(error));
        setLoading(false);
      }
    }
  }, [preload]);

  useEffect(() => {
    // Restore browser storage and start the network session after hydration.
    statsRef.current = readStats();
    setStats(statsRef.current);
    void start(null);
    return () => sessionRef.current?.controller.abort();
  }, [start]);

  const handleGuess = (accountId: string) => {
    const session = sessionRef.current;
    if (!session || session.answered || loading || !currentQuestion) return;
    if (!currentQuestion.accounts.some(account => account.account_id === accountId)) return;
    session.answered = true;
    setSelectedAnswer(accountId);
    const correct = accountId === currentQuestion.tweet.account_id;
    const nextStats = {
      correct: statsRef.current.correct + Number(correct), total: statsRef.current.total + 1,
    };
    statsRef.current = nextStats;
    setStats(nextStats);
    saveStats(nextStats);
  };

  const handleNextQuestion = () => {
    const session = sessionRef.current;
    if (!session || !session.answered || session.preloading) return;
    const question = session.next;
    if (!question) { void preload(session); return; }
    session.next = null;
    session.answered = false;
    session.seen.add(question.tweet.tweet_id);
    // Bound memory use during long sessions while preserving recent history.
    if (session.seen.size > 500) session.seen.delete(session.seen.values().next().value!);
    setCurrentQuestion(question);
    setSelectedAnswer(null);
    void preload(session);
  };

  const retry = () => {
    const session = sessionRef.current;
    if (currentQuestion && session) void preload(session);
    else void start(activeUsername);
  };

  return {
    currentQuestion, activeUsername, loading, preloading, error, selectedAnswer, stats,
    isCorrect: selectedAnswer !== null && selectedAnswer === currentQuestion?.tweet.account_id,
    start, handleGuess, handleNextQuestion, retry,
  };
}
