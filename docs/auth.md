# Authentication Standards

## Core Principles

This project uses **Clerk** with a server-first architecture. All authentication happens server-side—client-side auth hooks are intentionally avoided.

### Three Mandatory Rules

1. **Server-First Authentication**: All auth checks MUST happen in data helpers using `authClient()` from `@/lib/auth`
2. **Row-Level Security (RLS)**: Every database query MUST filter by `userId`
3. **Protected Helpers**: All data functions MUST include `import "server-only"` and call `authClient()` internally

### Protected Routes

**Rule**: All routes require authentication except `/` (landing page). Unauthenticated users redirect to `/`.

Protected: `/workouts/*`, `/exercises/*`, `/dashboard/*`, and all other routes.

---

## Authentication Patterns

### Pattern 1: Data Helper Functions (Standard)

All data helpers use `authClient()` internally - no parameters needed from caller.

```typescript
import "server-only";
import { db } from "@/db";
import { workouts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { authClient } from "@/lib/auth";

export async function getWorkouts() {
  const { userId } = await authClient();

  return await db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, userId))
    .orderBy(desc(workouts.date));
}
```

**For single-resource queries, always verify ownership:**

```typescript
import "server-only";
import { db } from "@/db";
import { workouts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authClient, ForbiddenError } from "@/lib/auth";

export async function getWorkoutById(workoutId: string) {
  const { userId } = await authClient();

  const workout = await db.query.workouts.findFirst({
    where: eq(workouts.id, workoutId),
  });

  // Verify ownership
  if (workout && workout.userId !== userId) {
    throw new ForbiddenError();
  }

  return workout;
}
```

**Mandatory Requirements**:

- ✅ Start with `import "server-only"`
- ✅ Call `authClient()` at function start
- ✅ Filter queries by `userId` (RLS)
- ✅ Verify ownership for single-resource queries

---

### Pattern 2: Server Components

Server Components just call data helpers - no auth logic needed.

```tsx
import { getWorkouts } from "@/data/workouts";
import { WorkoutCard } from "@/components/workout-card";

export async function WorkoutList() {
  const workouts = await getWorkouts();

  return (
    <div className="space-y-4">
      {workouts.map((workout) => (
        <WorkoutCard key={workout.id} {...workout} />
      ))}
    </div>
  );
}
```

**Steps**: Import helper → Call helper → Render data

Auth + ownership verification happens inside the helper.

---

### Pattern 3: Server Actions

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createWorkout } from "@/data/workouts";

export async function createWorkoutAction(formData: FormData) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;

  try {
    const workout = await createWorkout({
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

**Corresponding Helper**:

```typescript
import "server-only";
import { authClient, UnauthorizedError, ForbiddenError } from "@/lib/auth";
import { db } from "@/db";
import { workouts } from "@/db/schema";

export async function createWorkout(data: {
  name: string;
  description?: string;
  date: Date;
}) {
  const { userId } = await authClient();

  const [workout] = await db
    .insert(workouts)
    .values({
      userId, // Always associate with user
      ...data,
    })
    .returning();

  return workout;
}
```

---

### Pattern 4: Conditional UI (Client Components)

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

**Available Components**: `<SignedIn>`, `<SignedOut>`, `<UserButton>`, `<SignInButton>`, `<SignUpButton>`

---

## Database Schema

All user-owned tables MUST include `userId`:

```typescript
import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";

export const workouts = pgTable("workouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(), // Clerk user ID
  name: text("name").notNull(),
  date: timestamp("date", { withTimezone: true }).notNull(),
});
```

**Requirements**:

- Field: `userId` (camelCase in code)
- Column: `user_id` (snake_case in DB)
- Type: `text` (Clerk IDs are strings)
- Always `notNull()`

---

## Row-Level Security (RLS)

### Querying

✅ **Always filter by userId**:

```typescript
// List queries
const workouts = await db
  .select()
  .from(workouts)
  .where(eq(workouts.userId, userId));

// Single record with ownership check
const workout = await db
  .select()
  .from(workouts)
  .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)));
```

❌ **Never query without filtering**:

```typescript
// WRONG - Returns ALL users' data
const workouts = await db.select().from(workouts);
```

### Mutations

✅ **Always verify ownership before mutations**:

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

✅ **Always include `userId` in inserts**:

```typescript
const [workout] = await db
  .insert(workouts)
  .values({
    userId, // REQUIRED
    ...data,
  })
  .returning();
```

---

## Common Anti-Patterns

### ❌ Client-Side Auth Checks

```tsx
// WRONG - Not secure
"use client";
import { useUser } from "@clerk/nextjs";

export function MyComponent() {
  const { user } = useUser();
  if (!user) return <div>Please sign in</div>;
  return <div>Welcome {user.firstName}</div>;
}
```

**Fix**: Use Server Component with helper that calls `authClient()`.

---

### ❌ Missing "server-only" Directive

```typescript
// WRONG - Could leak to client bundle
import { db } from "@/db";

export async function getWorkouts() {
  return await db.select().from(workouts);
}
```

**Fix**: Always start data helpers with `import "server-only"`.

---

### ❌ Auth in Component Instead of Helper

```tsx
// WRONG - Auth logic in component
import { auth } from "@clerk/nextjs/server";
import { getWorkouts } from "@/data/workouts";

export async function WorkoutList() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const workouts = await getWorkouts(userId);
  return <div>...</div>;
}
```

**Fix**: Move auth into helper, component just calls helper.

---

### ❌ No RLS Filtering

```typescript
// WRONG - Returns all users' data
import { authClient } from "@/lib/auth";

export async function getAllWorkouts() {
  const { userId } = await authClient();
  return await db.select().from(workouts); // Missing WHERE clause
}
```

**Fix**: Always include `.where(eq(workouts.userId, userId))`.

---

### ❌ Skipping Ownership Verification

```typescript
// WRONG - Updates ANY workout
import { authClient } from "@/lib/auth";

export async function updateWorkout(
  workoutId: string,
  updates: Partial<Workout>
) {
  const { userId } = await authClient();
  await db.update(workouts).set(updates).where(eq(workouts.id, workoutId));
}
```

**Fix**: Fetch record first, verify `userId` matches, then update.

---

## Error Handling

### Custom Error Classes

`lib/auth.ts` exports two custom error types:

```typescript
import { UnauthorizedError, ForbiddenError } from "@/lib/auth";

// Thrown by authClient() when no userId
throw new UnauthorizedError();

// Thrown when user doesn't own resource
throw new ForbiddenError();

// Generic resource not found
throw new Error("Resource not found");
```

### Server Actions

```typescript
"use server";

import { UnauthorizedError, ForbiddenError } from "@/lib/auth";

export async function deleteWorkoutAction(workoutId: string) {
  try {
    await deleteWorkout(workoutId);
    revalidatePath("/workouts");
    redirect("/workouts");
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { error: "Please sign in to continue" };
    }
    if (error instanceof ForbiddenError) {
      return { error: "You don't have permission to delete this workout" };
    }
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Failed to delete workout" };
  }
}
```

---

## Configuration

### Middleware (proxy.ts)

```typescript
import { clerkMiddleware } from "@clerk/nextjs/server";

export const proxy = clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

**Note**: Use `clerkMiddleware()`, not deprecated `authMiddleware()`.

### Root Layout

```tsx
import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

---

## File Organization

```
/
├── proxy.ts                    # Clerk middleware
├── app/
│   ├── layout.tsx             # ClerkProvider wrapper
│   └── dashboard/
│       └── components/
│           └── workout-list.tsx # Server Component with auth
├── data/
│   ├── workouts.ts            # Data helpers (server-only)
│   └── exercises.ts
├── actions/
│   ├── workouts.ts            # Server Actions
│   └── exercises.ts
└── db/
    ├── schema.ts              # Tables with userId
    └── index.ts
```

---

## The authClient() Helper

Located at `lib/auth.ts`:

```typescript
import "server-only";
import { auth } from "@clerk/nextjs/server";
import { cache } from "react";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden: Access denied") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export const authClient = cache(async () => {
  const { userId } = await auth();

  if (!userId) {
    throw new UnauthorizedError();
  }

  return { userId };
});
```

**Why cache()?**
- React's `cache()` deduplicates calls within same request
- Multiple helpers calling `authClient()` only execute once
- Safe because middleware already validated session

**Why lightweight auth()?**
- Reads JWT from cookie/header
- No backend call to Clerk
- Middleware already verified session is active
- Fast, sufficient for RLS

**Custom errors?**
- `UnauthorizedError` - no userId in session
- `ForbiddenError` - user doesn't own resource
- Both extend `Error` for standard error handling

---

## Pre-Ship Checklist

- [ ] `ClerkProvider` wraps app in root layout
- [ ] Middleware uses `clerkMiddleware()` (not `authMiddleware`)
- [ ] All data helpers start with `import "server-only"`
- [ ] All data helpers call `authClient()` internally
- [ ] All queries filter by `userId`
- [ ] Single-resource queries verify ownership
- [ ] Server Actions call helpers (no duplicate auth logic)
- [ ] All tables include `userId: text("user_id").notNull()`
- [ ] No client-side auth hooks used
- [ ] Components don't call `auth()` directly
- [ ] Use `UnauthorizedError` and `ForbiddenError` from lib/auth

---

## Resources

- [Clerk Next.js Quickstart](https://clerk.com/docs/nextjs/getting-started/quickstart)
