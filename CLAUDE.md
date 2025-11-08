# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lifting diary app built with Next.js 16 (App Router), TypeScript, Clerk auth, Drizzle ORM + Neon PostgreSQL, shadcn/ui components, Tailwind CSS v4.

## Development Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Database Commands

```bash
npx drizzle-kit generate  # Generate migration from schema
npx drizzle-kit migrate   # Run migrations
npx drizzle-kit studio    # Open Drizzle Studio
npx drizzle-kit push      # Push schema changes directly
```

## Tech Stack Architecture

### Authentication

- **Clerk** (`@clerk/nextjs`) - middleware in `middleware.ts` protects routes
- Matcher configured to skip static files and Next.js internals

### Database Layer

- **Drizzle ORM** with Neon PostgreSQL serverless driver
- Schema: `db/schema.ts`
- Relations: `db/relations.ts`
- DB client: `db/index.ts` exports `db` instance
- Config: `drizzle.config.ts` (schema → migrations in `./drizzle/`)
- Requires `DATABASE_URL` env variable

### UI Components

- **shadcn/ui** (New York style, RSC-enabled)
- Config: `components.json`
- Path aliases: `@/components`, `@/lib`, `@/hooks`, `@/components/ui`
- Lucide icons
- `cn()` utility in `lib/utils.ts` for class merging (clsx + tailwind-merge)

### Styling

- **Tailwind CSS v4** with CSS variables
- Global styles: `app/globals.css`
- Base color: neutral
- PostCSS config: `postcss.config.mjs`

## Path Aliases

All imports use `@/*` pattern (configured in `tsconfig.json`):

- `@/components` → components/
- `@/lib` → lib/
- `@/db` → db/
- `@/app` → app/

## Environment Variables

Required in `.env`:

```text
DATABASE_URL=           # Neon PostgreSQL connection string
NEXT_PUBLIC_CLERK_*=   # Clerk public keys
CLERK_SECRET_KEY=      # Clerk secret key
```
