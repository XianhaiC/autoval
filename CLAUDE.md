# CLAUDE.md

## Stack
- Next.js 14 App Router, TypeScript, Tailwind CSS
- Supabase (auth + Postgres)
- Vitest for testing
- Deploy: Vercel

## Commands
- `yarn dev` — dev server
- `yarn build` — production build
- `yarn test:run` — run tests
- `yarn lint` — eslint

## Conventions
- Use yarn, not npm
- CSS design tokens in `app/globals.css` (--bg, --surface, --border, --text-primary, --accent, --radius)
- Browser Supabase client: `lib/supabase.ts`
- Server Supabase client: `lib/supabase-server.ts` (API routes only)
- Barrel exports in component folders (`components/index.ts`)
- `rounded-[var(--radius)]` for all border-radius (6px squarish)
- Touch targets minimum 44px
- Always write a plan before implementing features
