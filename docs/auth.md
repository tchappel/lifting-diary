# Authentication Standards

## Core Principles

This project uses **Clerk** with a server-first architecture. All authentication happens server-side—client-side auth hooks are intentionally avoided.

### Three Mandatory Rules

1. **Server-First Authentication**: All auth checks MUST happen server-side using `auth()` from `@clerk/nextjs/server`
2. **Row-Level Security (RLS)**: Every database query MUST filter by `userId`
3. **Protected Helpers**: All data functions MUST include `import "server-only"`, auth checks, and RLS filtering

### Protected Routes

**Rule**: All routes require authentication except `/` (landing page). Unauthenticated users redirect to `/`.

Protected: `/workouts/*`, `/exercises/*`, `/dashboard/*`, and all other routes.

---

## Authentication Patterns

### Pattern 1: Server Components

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

**Steps**: Import `auth` → Call `await auth()` → Extract `userId` → Throw if null → Pass to helpers

---

### Pattern 2: Data Helper Functions

Two approaches for data helpers:

**Approach A: Helper accepts `userId` parameter** (for lists/collections)

```typescript
import "server-only";
import { db } from "@/db";
import { workouts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getWorkoutsByUserId(userId: string) {
  return await db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, userId))
    .orderBy(desc(workouts.date));
}
```

**Approach B: Helper includes auth check** (for single resources)

```typescript
import "server-only";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { workouts } from "@/db/schema";
import { eq } from "drizzle-orm";

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

  // Verify ownership
  if (workout[0]?.userId !== userId) {
    throw new Error("Forbidden: Access denied");
  }

  return workout[0];
}
```

**Mandatory Requirements**:

- ✅ Start with `import "server-only"`
- ✅ Check `userId` exists
- ✅ Filter queries by `userId` (RLS)
- ✅ Verify ownership for single-resource queries

---

### Pattern 3: Server Actions

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createWorkoutHelper } from "@/data/workouts";

export async function createWorkoutAction(formData: FormData) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;

  try {
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

**Corresponding Helper**:

```typescript
import "server-only";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { workouts } from "@/db/schema";

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

**Fix**: Use Server Component parent with auth check, pass data to Client Component.

---

### ❌ Missing "server-only" Directive

```typescript
// WRONG - Could leak to client bundle
import { db } from "@/db";

export async function getWorkouts(userId: string) {
  return await db.select().from(workouts);
}
```

**Fix**: Always start data helpers with `import "server-only"`.

---

### ❌ No RLS Filtering

```typescript
// WRONG - Returns all users' data
export async function getAllWorkouts() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  return await db.select().from(workouts); // Missing WHERE clause
}
```

**Fix**: Always include `.where(eq(workouts.userId, userId))`.

---

### ❌ Skipping Ownership Verification

```typescript
// WRONG - Updates ANY workout
export async function updateWorkout(
  workoutId: string,
  updates: Partial<Workout>
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await db.update(workouts).set(updates).where(eq(workouts.id, workoutId));
}
```

**Fix**: Fetch record first, verify `userId` matches, then update.

---

## Error Handling

### Standard Error Messages

```typescript
// No userId
throw new Error("Unauthorized");

// User doesn't own resource
throw new Error("Forbidden: Access denied");

// Resource doesn't exist
throw new Error("Resource not found");
```

### Server Actions

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

## Pre-Ship Checklist

- [ ] `ClerkProvider` wraps app in root layout
- [ ] Middleware uses `clerkMiddleware()` (not `authMiddleware`)
- [ ] All data helpers start with `import "server-only"`
- [ ] All data helpers include `await auth()` check
- [ ] All queries filter by `userId`
- [ ] Mutations verify ownership before executing
- [ ] Server Actions call helpers (no duplicate auth logic)
- [ ] All tables include `userId: text("user_id").notNull()`
- [ ] No client-side auth hooks used
- [ ] Errors distinguish "Unauthorized" vs "Forbidden"

---

## Resources

- [Clerk Next.js Quickstart](https://clerk.com/docs/nextjs/getting-started/quickstart)
