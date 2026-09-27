# Guess the Poaster

A Next.js quiz using tweets and accounts from the Community Archive. Play with random authors or authors who have mentioned a username. Scores are stored locally in the browser.

## Development

Use Node.js 24 LTS (Node.js 22.13+ is also supported).

```sh
npm ci
cp .env.example .env.local
# Fill in the Supabase URL and anonymous key in .env.local.
npm run dev
```

Open http://localhost:3000. The database needs the `account`, `profile`, `tweets`, `mentioned_users`, and `user_mentions` tables and their existing relationships.

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are read on the server. Legacy `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` settings still work. Use an anonymous key, never a service-role key. No base URL setting is needed: API routes share database helpers directly.

Optional analytics uses `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST`. The SDK is loaded after hydration only when configured. Automatic interaction capture and session recording are disabled; anonymous visitors do not receive person profiles.

## Checks

```sh
npm run check       # lint, TypeScript, regression tests, production build
npm audit           # known dependency vulnerabilities
npm start           # serve a completed production build
```

Tests mock database and network calls, so checks and builds work without credentials. Run a live smoke test with your own database configuration before deploying.

## API behavior

All endpoints accept GET only. Invalid usernames/account IDs return 400, unsupported methods return 405 with `Allow: GET`, and database failures return a generic 500 response with details logged only on the server.

- `/api/accounts`: paginated account directory, cached for an hour per server process, with concurrent cache misses combined. Successful responses also have a one-hour shared HTTP cache. The former unauthenticated `refresh=true` cache bypass is no longer supported.
- `/api/random-accounts`: up to four unique accounts with avatars fetched in one query.
- `/api/mentions?username=alice`: up to four authors from the latest 100 mentions. Unknown usernames return an empty list. Lookups currently use the stored screen name's exact casing.
- `/api/random-tweet?account_id=123`: a tweet sampled from a batch of 20 rows, using a randomly chosen ordering. Empty archives return 404. Avatar data comes from the account response instead of another profile query.

Random responses and errors are not cached. Database HTTP requests have a ten-second timeout. Client reads use bounded retries for transient failures and cancel when the quiz mode changes or the page unmounts.

## Deployment review

- Verify Supabase grants and row-level security against the live project. An anonymous key does not itself limit access: public reads must cover only intended data, and anonymous writes should be denied. See [Supabase's RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security).
- Configure rate limits for public `/api/*` endpoints at the hosting edge or with a shared store if needed. The account cache is per process and is not a distributed rate limiter.
- Inspect database query plans before adding indexes, especially for tweet ordering within an account and mention lookup by user. No schema or index migrations are included here.
- Tweet sampling is bounded and biased toward the selected ordering's extremes. Uniform archive-wide sampling needs a database-backed sampling strategy; changing to full-table random sorting would add cost. Recent mention sampling can also produce fewer than four authors.
- The answer is present in the browser's quiz response. This is appropriate for a casual quiz; competitive scoring would need server-side answer validation.

The ESLint setup uses the [Next.js flat configuration](https://nextjs.org/docs/app/api-reference/config/eslint) and runs separately from the build.
