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
- [ ] Link project + push migration (see below — one-time, run by you)
- [ ] Auth wiring (magic link or email/password)
- [ ] Route structure + nav beyond the single placeholder page

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
Manual entry, transaction list, categories, Single Number home screen.
