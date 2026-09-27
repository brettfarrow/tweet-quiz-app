import '@/styles/globals.css';
import { useEffect } from 'react';
import type { AppProps } from 'next/app';

let analyticsStarted = false;

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || analyticsStarted) return;
    analyticsStarted = true;
    // Keep optional analytics out of the initial quiz bundle.
    void import('posthog-js').then(({ default: posthog }) => {
      posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
        person_profiles: 'identified_only',
        autocapture: false,
        disable_session_recording: true,
      });
    }).catch(() => { analyticsStarted = false; });
  }, []);

  return <Component {...pageProps} />;
}
