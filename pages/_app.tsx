import "@/styles/globals.css";
import { useEffect } from "react";
import type { AppProps } from "next/app";
import posthog from "posthog-js";
import { PostHogProvider } from 'posthog-js/react';

// Check if we're running on the server side or client side
const isServer = typeof window === 'undefined';

// Only initialize PostHog on the client
const posthogClient = isServer ? null : posthog;

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Initialize PostHog only on the client side
    if (!isServer && !posthog.__loaded) {
      const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY || '';
      if (posthogKey) {
        posthog.init(posthogKey, {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
          person_profiles: 'always',
          loaded: (ph) => {
            if (process.env.NODE_ENV === 'development') ph.debug();
          },
        });
      }
    }
  }, []);

  // During SSG/SSR, don't use PostHogProvider
  if (isServer) {
    return <Component {...pageProps} />;
  }

  // On the client, wrap with PostHogProvider
  return (
    <PostHogProvider client={posthogClient as typeof posthog}>
      <Component {...pageProps} />
    </PostHogProvider>
  );
}
