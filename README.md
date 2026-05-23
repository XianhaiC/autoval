# Hackathon Template

Full-stack Next.js 14 + Supabase + Tailwind starter. Web + API in one Vercel deploy.

## Stack
- **Framework:** Next.js 14 App Router + TypeScript
- **Styling:** Tailwind CSS with CSS design tokens
- **Auth:** Supabase Auth (email/password)
- **Database:** Supabase Postgres with RLS
- **Tests:** Vitest + Testing Library
- **Deploy:** Vercel (auto-deploy on push)

## Setup

1. Create a Supabase project at https://supabase.com
2. Copy `.env.local.example` to `.env.local` and fill in your keys
3. Create a user in Supabase Auth dashboard
4. `yarn install && yarn dev`

## Structure

```
app/                    # Pages + API routes
├── api/                # Serverless functions
├── auth/               # Auth pages
├── layout.tsx          # Root layout
└── page.tsx            # Home page

components/             # Shared UI components (barrel export)
lib/                    # Shared logic
├── supabase.ts         # Browser client
├── supabase-server.ts  # Server client (API routes)
└── types.ts            # Shared types

middleware.ts           # Auth guard
tests/                  # Vitest tests
```

## Conventions
- Page-specific components go in `app/{page}/components/`
- Shared components go in `components/` with barrel export
- API routes are thin controllers calling `lib/services/`
- CSS vars for design tokens (see `app/globals.css`)
- All border-radius uses `var(--radius)` for consistency
