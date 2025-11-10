# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lifting diary app built with Next.js 16 (App Router), TypeScript, Clerk auth, Drizzle ORM + Neon PostgreSQL, shadcn/ui components, Tailwind CSS v4.

## Domain-Specific Guidelines

**IMPORTANT:** Before making changes to any area of the project, check the `/docs` directory for domain-specific coding standards and guidelines.

Current documentation:

- **`docs/auth.md`** - Authentication patterns (Clerk integration, server-first auth, RLS, ownership verification)
- **`docs/data-fetching.md`** - Data fetching patterns (Server Components, helper functions, RLS policy)
- **`docs/data-mutation.md`** - Data mutation patterns (Server Actions, helper functions, validation, revalidation)
- **`docs/forms.md`** - Form handling patterns (react-hook-form, Zod validation, Server Actions, error handling)
- **`docs/ui.md`** - UI component standards (shadcn/ui usage, theming, date formatting)

Always consult the relevant docs file before implementing features in that domain.

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

- **Clerk** (`@clerk/nextjs`) - proxy in `proxy.ts` protects routes
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
