# AGENTS.md

## Cursor Cloud specific instructions

The Yard is a Next.js 16 (App Router, Turbopack, React 19) AI-powered workout
generator. There is a single web service; there is no separate backend. It runs
in one of two deployment modes selected by `NEXT_PUBLIC_DEPLOYMENT_MODE` /
`DEPLOYMENT_MODE` (see `src/lib/config.ts`):

- `self-hosted` (default): all profile/gym/workout data lives in the browser's
  `localStorage`. No database, auth, or payments. The only external dependency
  is `ANTHROPIC_API_KEY`, used by the AI workout generation endpoint. This is the
  simplest mode for local development.
- `hosted`: adds Supabase (auth + Postgres) and optional Stripe payments. Requires
  the Supabase / Stripe env vars in `.env.example`. The `npm run db:setup` script
  applies `supabase/migrations/*` against a Supabase Postgres via `DATABASE_URL`.

### Running / building / testing

Standard scripts in `package.json`; CI (`.github/workflows/ci.yml`) runs them in
this order: `npm run lint`, `npx tsc --noEmit`, `npm run test:run`, `npm run build`.

- Dev server: `npm run dev` (serves on http://localhost:3000). Defaults to
  `self-hosted` mode with no env file needed.
- Tests: `npm run test:run` (Vitest, jsdom). Some tests intentionally exercise
  error paths and print `console.error`/`stderr` lines (e.g. "Stripe down",
  "Stripe checkout error") while still passing — this is expected, not a failure.
- Build: CI runs `npm run build` with `DEPLOYMENT_MODE=hosted`; the build does
  not require live Supabase/Stripe/Anthropic credentials to succeed.

### Non-obvious notes

- No env file is required to start the app in `self-hosted` mode. To exercise the
  headline feature — AI workout generation (`POST /api/workout/generate`) — set
  `ANTHROPIC_API_KEY`; without it the endpoint returns 401
  "No API key configured." All other flows (creating profiles, gyms, equipment,
  filling the generate form) work without any secret.
- Next.js logs a deprecation warning that the `middleware` file convention should
  be renamed to `proxy`. This is only a warning and does not affect the dev server
  or build.
- `docker/` and `docs/hosting-guide.md` describe the production (`hosted`)
  self-hosting deployment; they are not needed for local development.
