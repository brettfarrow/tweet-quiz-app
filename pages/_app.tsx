import "@/styles/globals.css";
import posthog from "posthog-js"
import { PostHogProvider } from 'posthog-js/react'
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
    if (typeof window !== 'undefined') { // checks that we are client-side
      const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY || ''
      posthog.init(posthogKey, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
        person_profiles: 'always', // or 'always' to create profiles for anonymous users as well
        loaded: (posthog) => {
          if (process.env.NODE_ENV === 'development') posthog.debug() // debug mode in development
        },
      })
    }

    return (
      <>
        <PostHogProvider client={posthog}>
          <Component {...pageProps} />
        </PostHogProvider>
      </>
    )
}