# Tend — App

Calm money tracker. PWA, Next.js + TypeScript + Tailwind, Postgres (Supabase), manual-entry MVP.

See `Tend_Brand_Concept_Spec.md` (sibling folder) for product/brand source of truth.

## Phase 0 — Foundation

- [x] Scaffold Next.js (App Router, TS, Tailwind v4)
- [x] Apply design tokens (`design-tokens.md`) to globals.css (Tailwind v4 CSS-first `@theme`) — palette as `bg-ink`/`bg-paper`/etc, Fraunces (`font-display`) + Inter (`font-body`) via next/font
- [x] Git init + first commit
- [x] Placeholder home screen (Single Number layout, no real data yet)
- [x] Supabase project created, keys in `.env.local`
- [x] Supabase client wiring (`src/lib/supabase/client.ts`, `server.ts`, `src/proxy.ts` for session refresh)
- [x] Schema written as a tracked migration: `supabase/migrations/20260623000000_initial_schema.sql`
- [x] Link project + push migration — done, verified live (`transactions` REST endpoint returns 200)
- [x] Auth wiring: email/password sign up + login + sign out (`src/app/login`), protected routes via `src/proxy.ts`

### Running locally
```
# node-v24.16.0-win-x64 is currently outside PATH for some shells — if `npm` isn't
# found, prepend it for the session: $env:Path = "<node dir>;$env:Path"
npm run dev
```

### One-time: link Supabase project + apply schema
These steps need your own Supabase login (browser OAuth) and DB password, so run them yourself:
```
npx supabase login
npx supabase link --project-ref yfvlohztefetuhmxahnu
npx supabase db push
```
`db push` applies every migration in `supabase/migrations/` to the linked project. Future schema
changes: add a new file to that folder (`npx supabase migration new <name>`), then `db push` again —
never hand-edit tables in the dashboard once this is set up, so the migrations folder stays the
source of truth.

## Phase 1 — Core loop

- [x] Auth (see Phase 0)
- [x] Categories — 8 calm defaults (Food & drink, Transport, Bills & utilities, Shopping, Health,
      Entertainment, Income, Other), seeded automatically on signup via a DB trigger
      (`supabase/migrations/20260623010000_seed_default_categories.sql`); existing accounts backfilled
      (`20260623020000_backfill_default_categories.sql`)
- [x] Manual transaction entry (`/transactions/new`) — amount, expense/income toggle, category, date,
      optional note
- [x] Transaction list — grouped by day, on the home screen
- [x] Real number on the home screen: "Spent this month" sums this month's expenses from actual data

Note: Supabase's free-tier built-in email service has a low send-rate limit (a few per hour) —
expect "email rate limit exceeded" if you test signup repeatedly. Not an issue for real beta users
signing up once; revisit with a custom SMTP provider before a real launch.

## Phase 2 — Budgeting

- [x] Set/edit one monthly total budget (`/budget`) — upserts `budgets` by `(user_id, month)`
- [x] Home screen shows the real "Left to spend this month" once a budget exists, falling back to
      "Spent this month" before one is set (never shows a number that overclaims what we know)
- [x] "Where you stand" detail: quiet Income / Spent line beneath the headline number
- [x] Gentle pace signal (`src/lib/signal.ts`) — compares spend pace to days elapsed in the month,
      three calm states (on track / spending faster than usual / budget used up), no red, no alarms
- [x] Per-category budget lines — optional per-category monthly allocation, set/edit/clear on `/budget`
      below the total budget (`budget_lines` table, set/edit only, no spend-vs-allocated display yet)

### Verified manually (Playwright smoke test, not checked in each time)
Signup → login → add transaction → category and amount show correctly on the home screen → sign out
clears the session → protected routes redirect to `/login` → set a budget → "Left to spend" and the
pace signal update correctly → adding a transaction live-updates the number. Caught and fixed two real
bugs this way: an unhandled "email confirmation required" signup path, and category embeds from
Supabase returning a singular object rather than an array (no generated DB types yet —
`supabase gen types` would close this gap, deferred for now).

Per-category budget lines also Playwright-verified: set two category allocations, reload (values
persist, untouched categories stay blank), clear one and edit another (clears delete the
`budget_lines` row rather than leaving a stale value), total budget form unaffected.

## PWA polish

- [x] Web manifest (`src/app/manifest.ts`) — name, icons, `display: "standalone"`, paper background/theme color
- [x] App icons (`public/icons/`) generated from the Tend mark, wired into `layout.tsx` metadata (`icons`, `appleWebApp`, `viewport.themeColor`)
- [x] Minimal service worker (`public/sw.js`) — caches only `public/offline.html`; all real data (transactions, budget) always hits the network, never cached
- [x] iOS safe-area CSS (`globals.css`) — `env(safe-area-inset-*)` applied to `body`, plus `.safe-top`/`.safe-bottom` utilities for future fixed elements
- [x] Fixed `src/proxy.ts` auth matcher excluding `manifest.webmanifest`, `icons/`, `sw.js`, `offline.html` from the login redirect — these must be reachable unauthenticated for installability to work at all

Verified manifest/icons/sw.js/offline.html all return 200 (not redirected to `/login`) and render
correctly via curl + headless Chrome at iPhone viewport dimensions. Real iOS device/Simulator
confirmation (actual notch/home-indicator spacing) still pending — Chrome emulation can't reproduce
nonzero safe-area insets.
