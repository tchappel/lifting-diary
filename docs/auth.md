# Authentication Standards

## Overview

This project uses **Clerk** for authentication with a server-first architecture. All authentication checks happen server-side using Server Components, Server Actions, and data helper functions. Client-side auth hooks are intentionally avoided to keep auth logic centralized and secure.

## Core Principles

### 1. Server-First Authentication

**MANDATORY**: All authentication checks MUST happen server-side.

- ✅ Use `auth()` from `@clerk/nextjs/server` in Server Components
- ✅ Include auth checks in data helper functions
- ❌ NEVER use client-side auth hooks (`useUser`, `useAuth`)
- ❌ NEVER perform auth checks in Client Components

### 2. Row-Level Security (RLS)

**MANDATORY**: Every database query MUST filter by `userId` to enforce data isolation.

- ✅ Always include `userId` in WHERE clauses
- ✅ Verify ownership before mutations
- ❌ NEVER query without filtering by user
- ❌ NEVER skip ownership checks

### 3. Protected Helper Functions

**MANDATORY**: All data helper functions MUST include:

1. `import "server-only"` directive
2. Auth check with `await auth()`
3. RLS filtering by `userId`

---

## Clerk Configuration

### Installation

```bash
npm install @clerk/nextjs
```

**Version**: `@clerk/nextjs` v6.34.5 (or later)

### Environment Variables

Add to `.env` or `.env.local`:

```text
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### Root Layout Setup

**File**: `app/layout.tsx`

```tsx
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <header className="flex justify-end items-center p-4 gap-4">
            <SignedOut>
              <SignInButton mode="modal" />
              <SignUpButton mode="modal" />
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </header>
          <main>{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

**Pattern**:

- Wrap entire app with `<ClerkProvider>`
- Use `<SignedIn>` / `<SignedOut>` for conditional UI
- Place auth UI in global header

---

## Middleware Configuration

### Proxy Setup

**File**: `proxy.ts` (root directory)

```typescript
import { clerkMiddleware } from "@clerk/nextjs/server";

export const proxy = clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
```

**Pattern**:

- ✅ Use `clerkMiddleware()` from `@clerk/nextjs/server`
- ✅ Export as named export `proxy`
- ✅ Configure matcher to skip static assets
- ❌ DON'T use deprecated `authMiddleware` (pre-v5)

**Important**: Middleware runs on matched routes but doesn't enforce authentication by default. Auth enforcement happens in components/helpers.

---

## Protected Routes

### Route Protection Strategy

**Rule**: All routes MUST be protected except the landing page (`/`). Unauthenticated users are redirected to `/`.

### Implementation

**File**: `proxy.ts`

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/workouts(.*)",
  "/exercises(.*)",
  "/dashboard(.*)",
  // Add other protected routes here
]);

export const proxy = clerkMiddleware(async (auth, req) => {
  // Skip protection for landing page
  if (req.nextUrl.pathname === "/") {
    return;
  }

  // Protect all other routes
  if (isProtectedRoute(req)) {
    await auth.protect({
      unauthenticatedUrl: "/",
    });
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

### Route Patterns

✅ **Public Routes** (accessible without auth):

- `/` - Landing page

❌ **Protected Routes** (require authentication):

- `/workouts/*` - All workout pages
- `/exercises/*` - All exercise pages
- `/dashboard/*` - Dashboard pages
- All other routes not explicitly public

### Alternative: Protect All Except Home

For simpler configuration, protect everything except `/`:

```typescript
import { clerkMiddleware } from "@clerk/nextjs/server";

export const proxy = clerkMiddleware(async (auth, req) => {
  // Only allow unauthenticated access to landing page
  if (req.nextUrl.pathname !== "/") {
    await auth.protect({
      unauthenticatedUrl: "/",
    });
  }
});
```

**Pattern**:

- ✅ Use `auth.protect()` to enforce authentication
- ✅ Set `unauthenticatedUrl: "/"` to redirect to landing page
- ✅ Explicitly check for `/` to allow public access
- ❌ DON'T rely on client-side route guards
- ❌ DON'T duplicate route protection logic

---

## Authentication Patterns

### Pattern 1: Server Component with Auth Check

**Use when**: Rendering authenticated pages/components

```tsx
import { auth } from "@clerk/nextjs/server";
import { getWorkoutsByUserId } from "@/data/workouts";

export async function WorkoutList() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const workouts = await getWorkoutsByUserId(userId);

  return (
    <div className="space-y-4">
      {workouts.map((workout) => (
        <WorkoutCard key={workout.id} {...workout} />
      ))}
    </div>
  );
}
```

**Steps**:

1. Import `auth` from `@clerk/nextjs/server`
2. Call `await auth()` to get auth object
3. Extract `userId` from result
4. Throw error if `userId` is null/undefined
5. Pass `userId` to data helpers

**Alternative Error Handling**:

```tsx
import { redirect } from "next/navigation";

if (!userId) {
  redirect("/sign-in");
}
```

---

### Pattern 2: Data Helper Functions

**Use when**: Creating reusable data fetching/mutation functions

**File**: `data/workouts.ts`

```typescript
import "server-only";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { workouts } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

export async function getWorkoutsByUserId(userId: string) {
  return await db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, userId))
    .orderBy(desc(workouts.date));
}

export async function getWorkoutById(workoutId: string) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const workout = await db
    .select()
    .from(workouts)
    .where(eq(workouts.id, workoutId))
    .limit(1);

  // RLS: Verify ownership
  if (workout[0]?.userId !== userId) {
    throw new Error("Forbidden: Access denied");
  }

  return workout[0];
}
```

**MANDATORY Requirements**:

1. ✅ Start file with `import "server-only"`
2. ✅ Import `auth` from `@clerk/nextjs/server`
3. ✅ Check `userId` exists
4. ✅ Filter queries by `userId` (RLS)
5. ✅ Verify ownership for single-resource queries

**Two Approaches**:

**Approach A**: Helper accepts `userId` parameter

- Caller performs auth check
- Helper focuses on data logic + RLS filtering
- Use for list/collection queries

**Approach B**: Helper includes auth check internally

- Self-contained authentication
- Includes ownership verification
- Use for single-resource queries (by ID)

---

### Pattern 3: Server Actions

**Use when**: Handling form submissions, mutations

**File**: `actions/workouts.ts`

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createWorkoutHelper, updateWorkoutHelper } from "@/data/workouts";

export async function createWorkoutAction(formData: FormData) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;

  try {
    // Helper includes auth check
    const workout = await createWorkoutHelper({
      name,
      description,
      date: new Date(),
    });

    revalidatePath("/workouts");
    redirect(`/workouts/${workout.id}`);
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to create workout",
    };
  }
}
```

**Corresponding Helper** (`data/workouts.ts`):

```typescript
import "server-only";
import { auth } from "@clerk/nextjs/server";

export async function createWorkoutHelper(data: {
  name: string;
  description?: string;
  date: Date;
}) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const [workout] = await db
    .insert(workouts)
    .values({
      userId, // Associate with user
      ...data,
    })
    .returning();

  return workout;
}
```

**Pattern**:

- ✅ Server Action handles framework logic (revalidation, redirects, error handling)
- ✅ Helper function includes auth check + business logic
- ✅ Always associate created records with `userId`
- ✅ Return errors for form validation

---

### Pattern 4: Conditional UI (Client Components)

**Use when**: Showing/hiding UI based on auth state

```tsx
import {
  SignedIn,
  SignedOut,
  UserButton,
  SignInButton,
  SignUpButton,
} from "@clerk/nextjs";

export default function Header() {
  return (
    <header className="flex justify-end items-center p-4 gap-4">
      <SignedOut>
        <SignInButton mode="modal" />
        <SignUpButton mode="modal" />
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
    </header>
  );
}
```

**Available Components**:

- `<SignedIn>`: Renders children only when authenticated
- `<SignedOut>`: Renders children only when NOT authenticated
- `<UserButton>`: Pre-built user menu/profile button
- `<SignInButton>`: Triggers sign-in flow
- `<SignUpButton>`: Triggers sign-up flow

**Component Props**:

```tsx
<SignInButton mode="modal" /> // Opens in modal
<SignInButton mode="redirect" redirectUrl="/dashboard" /> // Redirects after sign-in
<UserButton afterSignOutUrl="/" /> // Redirect after sign-out
```

---

## Database Schema

### User ID Storage

All user-owned tables MUST include a `userId` field:

```typescript
// db/schema.ts
import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";

export const workouts = pgTable("workouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(), // Clerk user ID
  name: text("name").notNull(),
  date: timestamp("date", { withTimezone: true }).notNull(),
});

export const exercises = pgTable("exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(), // Clerk user ID
  name: text("name").notNull(),
});
```

**Requirements**:

- ✅ Field name: `userId` (camelCase in code)
- ✅ Column name: `user_id` (snake_case in DB)
- ✅ Type: `text` (Clerk user IDs are strings)
- ✅ Always `notNull()`
- ✅ Used for RLS filtering in queries

---

## Row-Level Security (RLS)

### Querying User Data

**MANDATORY**: Always filter by `userId`

✅ **DO**: Filter by userId

```typescript
// List queries
const workouts = await db
  .select()
  .from(workouts)
  .where(eq(workouts.userId, userId));

// Single record with compound filter
const workout = await db
  .select()
  .from(workouts)
  .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)));
```

❌ **DON'T**: Query without filtering

```typescript
// WRONG - Returns ALL users' data
const workouts = await db.select().from(workouts);

// WRONG - No userId filter
const workout = await db
  .select()
  .from(workouts)
  .where(eq(workouts.id, workoutId));
```

### Mutations (Insert/Update/Delete)

**MANDATORY**: Verify ownership before mutations

✅ **DO**: Verify ownership

```typescript
export async function deleteWorkoutHelper(workoutId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Fetch and verify ownership
  const existing = await db
    .select()
    .from(workouts)
    .where(eq(workouts.id, workoutId))
    .limit(1);

  if (!existing[0]) {
    throw new Error("Workout not found");
  }

  if (existing[0].userId !== userId) {
    throw new Error("Forbidden: Access denied");
  }

  // Now safe to delete
  await db.delete(workouts).where(eq(workouts.id, workoutId));
}
```

❌ **DON'T**: Skip ownership check

```typescript
// WRONG - Deletes ANY workout
export async function deleteWorkoutHelper(workoutId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await db.delete(workouts).where(eq(workouts.id, workoutId));
}
```

### Insert Operations

**MANDATORY**: Always include `userId` when creating records

✅ **DO**: Associate with user

```typescript
export async function createWorkoutHelper(data: WorkoutInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [workout] = await db
    .insert(workouts)
    .values({
      userId, // REQUIRED
      ...data,
    })
    .returning();

  return workout;
}
```

---

## Common Anti-Patterns

### ❌ ANTI-PATTERN 1: Client-Side Auth Checks

```tsx
// WRONG - Client Component with auth
"use client";
import { useUser } from "@clerk/nextjs";

export function MyComponent() {
  const { user } = useUser();

  if (!user) return <div>Please sign in</div>;

  return <div>Welcome {user.firstName}</div>;
}
```

**Why it's wrong**: Auth state can be manipulated client-side. Not secure for protecting data/actions.

**Correct approach**:

```tsx
// Server Component parent
import { auth } from "@clerk/nextjs/server";

export async function MyComponentWrapper() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  return <MyClientComponent />;
}

// Client Component (no auth logic)
("use client");
export function MyClientComponent() {
  return <div>Protected content</div>;
}
```

---

### ❌ ANTI-PATTERN 2: Missing "server-only" Directive

```typescript
// WRONG - Missing directive
import { db } from "@/db";

export async function getWorkouts(userId: string) {
  return await db.select().from(workouts);
}
```

**Why it's wrong**: Function could accidentally be imported in Client Components, leaking DB logic to browser bundle.

**Correct approach**:

```typescript
// CORRECT
import "server-only";
import { db } from "@/db";

export async function getWorkouts(userId: string) {
  return await db.select().from(workouts).where(eq(workouts.userId, userId));
}
```

---

### ❌ ANTI-PATTERN 3: No RLS Filtering

```typescript
// WRONG - Returns all users' data
export async function getAllWorkouts() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  return await db.select().from(workouts); // Missing WHERE clause
}
```

**Correct approach**:

```typescript
export async function getAllWorkouts() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  return await db.select().from(workouts).where(eq(workouts.userId, userId)); // RLS filter
}
```

---

### ❌ ANTI-PATTERN 4: Deprecated Middleware

```typescript
// WRONG - Using deprecated authMiddleware
import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware();

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

**Correct approach**:

```typescript
// CORRECT - Use clerkMiddleware
import { clerkMiddleware } from "@clerk/nextjs/server";

export const proxy = clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

---

### ❌ ANTI-PATTERN 5: Skipping Ownership Verification

```typescript
// WRONG - No ownership check before update
export async function updateWorkout(
  workoutId: string,
  updates: Partial<Workout>
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await db.update(workouts).set(updates).where(eq(workouts.id, workoutId)); // Updates ANY workout!
}
```

**Correct approach**:

```typescript
export async function updateWorkout(
  workoutId: string,
  updates: Partial<Workout>
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Verify ownership first
  const existing = await db
    .select()
    .from(workouts)
    .where(eq(workouts.id, workoutId))
    .limit(1);

  if (!existing[0] || existing[0].userId !== userId) {
    throw new Error("Forbidden: Access denied");
  }

  await db.update(workouts).set(updates).where(eq(workouts.id, workoutId));
}
```

---

## Error Handling

### Standard Error Messages

Use consistent error messages:

```typescript
// Unauthorized (no userId)
throw new Error("Unauthorized");

// Forbidden (user doesn't own resource)
throw new Error("Forbidden: Access denied");

// Not found
throw new Error("Resource not found");
```

### Error Handling in Server Actions

```typescript
"use server";

export async function deleteWorkoutAction(workoutId: string) {
  try {
    await deleteWorkoutHelper(workoutId);
    revalidatePath("/workouts");
    redirect("/workouts");
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Failed to delete workout" };
  }
}
```

**Pattern**:

- Catch errors from helpers
- Return `{ error: string }` for form validation
- Let framework errors (redirect) throw normally

---

## File Organization

### Recommended Structure

```
/
├── proxy.ts                      # Clerk middleware
├── app/
│   ├── layout.tsx               # ClerkProvider wrapper
│   └── dashboard/
│       └── components/
│           └── workout-list.tsx # Server Component with auth
├── data/
│   ├── workouts.ts              # Data helpers (server-only)
│   └── exercises.ts             # Data helpers (server-only)
├── actions/
│   ├── workouts.ts              # Server Actions
│   └── exercises.ts             # Server Actions
└── db/
    ├── schema.ts                # Tables with userId fields
    └── index.ts                 # DB client
```

### File Patterns

**Data Helpers** (`data/*.ts`):

- Start with `import "server-only"`
- Include auth checks
- Implement RLS filtering
- Export async functions

**Server Actions** (`actions/*.ts` or inline):

- Start with `"use server"`
- Call data helpers
- Handle revalidation/redirects
- Return errors for forms

**Server Components**:

- Import `auth` from `@clerk/nextjs/server`
- Perform auth checks
- Pass `userId` to helpers
- Render UI

---

## Quick Reference Checklist

Before shipping auth-related code, verify:

- [ ] `ClerkProvider` wraps app in root layout
- [ ] Middleware uses `clerkMiddleware()` (not deprecated `authMiddleware`)
- [ ] All data helpers start with `import "server-only"`
- [ ] All data helpers include auth check with `await auth()`
- [ ] All database queries filter by `userId`
- [ ] Mutations verify ownership before executing
- [ ] Server Actions call helpers (don't duplicate auth logic)
- [ ] All tables include `userId: text("user_id").notNull()`
- [ ] No client-side auth hooks (`useUser`, `useAuth`) used
- [ ] Errors distinguish between "Unauthorized" and "Forbidden"

---

## Additional Resources

- [Clerk Next.js Documentation](https://clerk.com/docs/quickstarts/nextjs)
- [Clerk Middleware Guide](https://clerk.com/docs/references/nextjs/clerk-middleware)
- [Next.js App Router Authentication](https://nextjs.org/docs/app/building-your-application/authentication)
- Project docs: `/docs/data-fetching.md` (data layer patterns)
- Project docs: `/docs/data-mutation.md` (mutation patterns)
