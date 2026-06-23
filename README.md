# Tend — App

Calm money tracker. PWA, Next.js + TypeScript + Tailwind, Postgres (Supabase), manual-entry MVP.

See `Tend_Brand_Concept_Spec.md` (sibling folder) for product/brand source of truth.

## Phase 0 — Foundation

- [x] Scaffold Next.js (App Router, TS, Tailwind v4)
- [x] Apply design tokens (`design-tokens.md`) to globals.css (Tailwind v4 CSS-first `@theme`) — palette as `bg-ink`/`bg-paper`/etc, Fraunces (`font-display`) + Inter (`font-body`) via next/font
- [x] Git init + first commit
- [x] Placeholder home screen (Single Number layout, no real data yet)
- [ ] Supabase project (auth + Postgres) — needs your Supabase account
- [ ] DB schema migration (see `schema.sql`)
- [ ] Auth wiring (magic link or email/password)
- [ ] Route structure + nav beyond the single placeholder page

### Running locally
```
# node-v24.16.0-win-x64 is currently outside PATH for some shells — if `npm` isn't
# found, prepend it for the session: $env:Path = "<node dir>;$env:Path"
npm run dev
```

## Phase 1 — Core loop
Manual entry, transaction list, categories, Single Number home screen.
