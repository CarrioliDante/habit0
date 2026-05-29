@AGENTS.md

# Habit0

Habit tracker minimalista. Next.js 15 App Router + Drizzle ORM + Neon PostgreSQL + Clerk Auth.

## Commands

```bash
pnpm dev              # Next.js dev server
pnpm build            # Production build
pnpm start            # Start production server
pnpm lint             # ESLint
pnpm db:generate      # Regenerate Drizzle client
pnpm db:push          # Push schema to Neon
pnpm db:studio        # Open Drizzle Studio
```

## Architecture

```
app/          — Next.js App Router (pages + API routes)
components/   — UI primitives and feature components
db/           — Drizzle schema and migrations
lib/          — Utilities, API client, hooks, cache, metrics
types/        — Shared TypeScript types
```

### Stack
- **Framework**: Next.js 15 (App Router)
- **DB**: Neon (serverless PostgreSQL) via Drizzle ORM
- **Auth**: Clerk (middleware + client)
- **Cache**: Upstash Redis
- **Styling**: Tailwind CSS v4 + custom design tokens
- **Icons**: Tabler Icons (no Lucide)

### Design System
- Monocromático — sin colores ni gradientes
- Tokens CSS: --bg, --surface, --surface-alt, --ink, --mute, --faint, --whisper, --hairline
- Tipografía: Inter (body), Inter Tight (display), JetBrains Mono (mono/kbd)
- Light/dark mode vía [data-theme="dark"]
- Animaciones con framer-motion

## Domain Model

| Model | Key Fields |
|-------|-----------|
| Habit | title, description, icon, color, cadence, targetPerDay, allowMultiplePerDay, jokerPolicy, reminder, isArchived |
| Checkin | habitId, userId, date, count, note |
| Group | name, color, icon (tags/categorías) |
| Routine | name, description, color, icon, daysOfWeek, order, isArchived |

## Conventions

- Server Components first; 'use client' solo cuando es necesario
- API routes en `app/api/*` siguen REST
- Mutaciones con React Query + fetch wrapper
- Offline-first: local cache con cola de sync
- No colores en UI — monocromático siempre
- Footer "Hecho en Argentina" obligatorio en todas las páginas web

## Environment Variables

- `DATABASE_URL` — Neon PostgreSQL connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `UPSTASH_REDIS_URL`
- `UPSTASH_REDIS_TOKEN`

## What to Avoid

- No colores, gradientes ni emojis en la UI
- No dependencias nuevas sin verificar utilidades existentes
- No raw fetch() en componentes — usar lib/api.ts
- No queries directas a DB desde el cliente
