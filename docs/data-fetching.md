# Data Fetching Standards

Comprehensive documentation for data fetching patterns following standards in the Lifting Diary project.

## Core Principles

### Server-Side Data Fetching Only

**MANDATORY:** All data fetching MUST happen server-side in React Server Components.

- ✅ **DO:** Fetch data in Server Components
- ✅ **DO:** Use helper functions from `/data` directory
- ❌ **DO NOT:** Fetch data in Client Components
- ❌ **DO NOT:** Use `useEffect` + `fetch` patterns
- ❌ **DO NOT:** Query database directly in Server Components

### Helper Function Architecture

**MANDATORY:** All database queries MUST be encapsulated in helper functions in the `/data` directory.

**File Structure:**

```
data/
├── workouts.ts      # Workout-related queries
├── exercises.ts     # Exercise-related queries
├── users.ts         # User-related queries
└── ...
```

**Domain Grouping:** Group helpers by domain (workouts, exercises, users, etc.).

---

## Helper Function Standards

### 1. Server-Only Enforcement

**MANDATORY:** Every helper file MUST import `"server-only"` at the top.

```typescript
// ✅ CORRECT - server-only import
import "server-only";
import { db } from "@/db";
import { workouts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getWorkoutsByUserId(userId: string) {
  return await db.select().from(workouts).where(eq(workouts.userId, userId));
}
```

```typescript
// ❌ INCORRECT - Missing server-only
import { db } from "@/db";
import { workouts } from "@/db/schema";

export async function getWorkoutsByUserId(userId: string) {
  return await db.select().from(workouts);
}
```

**Why?** This prevents accidental use in Client Components and keeps sensitive logic server-side.

---

### 2. Drizzle ORM Queries

**MANDATORY:** Use Drizzle ORM for all database queries.

```typescript
import { db } from "@/db";
import { workouts, exercises } from "@/db/schema";
import { eq, and, desc, gte, lt } from "drizzle-orm";

// ✅ CORRECT - Drizzle ORM
export async function getWorkoutsByUserId(userId: string) {
  return await db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, userId))
    .orderBy(desc(workouts.date));
}

// ✅ CORRECT - Complex query with joins
export async function getWorkoutWithExercises(workoutId: string) {
  return await db
    .select()
    .from(workouts)
    .leftJoin(workoutExercises, eq(workouts.id, workoutExercises.workoutId))
    .leftJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .where(eq(workouts.id, workoutId));
}
```

```typescript
// ❌ INCORRECT - Raw SQL
export async function getWorkoutsByUserId(userId: string) {
  return await db.execute(
    sql`SELECT * FROM workouts WHERE user_id = ${userId}`
  );
}
```

**Exception:** Raw SQL is allowed only for complex operations not supported by Drizzle ORM (rare).

---

### 3. Business Logic & Auth Checks

**MANDATORY:** Helpers MUST include business logic, auth checks, and RLS (Row-Level Security) policies.

#### Auth Checks

```typescript
import "server-only";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { workouts } from "@/db/schema";
import { eq } from "drizzle-orm";

// ✅ CORRECT - Auth check included
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

  // RLS: Ensure user owns the workout
  if (workout[0]?.userId !== userId) {
    throw new Error("Forbidden: Access denied");
  }

  return workout[0];
}
```

```typescript
// ❌ INCORRECT - No auth check
export async function getWorkoutById(workoutId: string) {
  return await db.select().from(workouts).where(eq(workouts.id, workoutId));
}
```

#### RLS Policies

**MANDATORY:** Implement Row-Level Security in helpers to prevent unauthorized data access.

```typescript
// ✅ CORRECT - RLS policy enforced
export async function getUserExercises() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // RLS: Only return exercises owned by current user
  return await db.select().from(exercises).where(eq(exercises.userId, userId));
}
```

```typescript
// ❌ INCORRECT - No RLS policy
export async function getAllExercises() {
  return await db.select().from(exercises); // Returns ALL users' exercises!
}
```

#### Business Logic

Include domain-specific logic in helpers:

```typescript
// ✅ CORRECT - Business logic included
export async function getWorkoutsByUserIdAndDate(userId: string, date: Date) {
  // Business logic: Calculate date range
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return await db
    .select()
    .from(workouts)
    .where(
      and(
        eq(workouts.userId, userId),
        gte(workouts.date, startOfDay),
        lt(workouts.date, endOfDay)
      )
    )
    .orderBy(desc(workouts.date));
}
```

---

### 4. TypeScript Typing

**MANDATORY:** Properly type return values and parameters.

```typescript
import "server-only";
import { db } from "@/db";
import { workouts } from "@/db/schema";
import type { Workout } from "@/db/schema";

// ✅ CORRECT - Properly typed
export async function getWorkoutsByUserId(userId: string): Promise<Workout[]> {
  return await db.select().from(workouts).where(eq(workouts.userId, userId));
}

// ✅ CORRECT - Inferred return type
export async function getWorkoutById(workoutId: string) {
  return await db
    .select()
    .from(workouts)
    .where(eq(workouts.id, workoutId))
    .limit(1)
    .then((rows) => rows[0] ?? null);
}
```

---

### 5. Error Handling

**MANDATORY:** Handle errors gracefully with meaningful messages.

```typescript
// ✅ CORRECT - Error handling
export async function deleteWorkout(workoutId: string) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  try {
    const workout = await db
      .select()
      .from(workouts)
      .where(eq(workouts.id, workoutId))
      .limit(1);

    if (!workout[0]) {
      throw new Error("Workout not found");
    }

    if (workout[0].userId !== userId) {
      throw new Error("Forbidden: Access denied");
    }

    await db.delete(workouts).where(eq(workouts.id, workoutId));

    return { success: true };
  } catch (error) {
    console.error("Failed to delete workout:", error);
    throw new Error("Failed to delete workout");
  }
}
```

---

## Server Component Integration

### Import and Use Helpers

**MANDATORY:** Server Components MUST import helpers from `/data` and NOT query directly.

```tsx
// ✅ CORRECT - Using helper function
import { getWorkoutsByUserId } from "@/data/workouts";
import { auth } from "@clerk/nextjs/server";

export default async function WorkoutsPage() {
  const { userId } = await auth();

  if (!userId) {
    return <div>Please sign in</div>;
  }

  const workouts = await getWorkoutsByUserId(userId);

  return (
    <div>
      {workouts.map((workout) => (
        <div key={workout.id}>{workout.name}</div>
      ))}
    </div>
  );
}
```

```tsx
// ❌ INCORRECT - Querying directly in Server Component
import { db } from "@/db";
import { workouts } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function WorkoutsPage() {
  const userId = "user_123";

  // DON'T DO THIS!
  const workouts = await db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, userId));

  return <div>...</div>;
}
```

**Why?** Helpers centralize business logic, auth checks, and RLS policies. Querying directly bypasses these safeguards.

---

### Parallel Data Fetching

Use `Promise.all` for parallel queries:

```tsx
// ✅ CORRECT - Parallel fetching
import { getWorkoutsByUserId } from "@/data/workouts";
import { getUserExercises } from "@/data/exercises";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    return <div>Please sign in</div>;
  }

  const [workouts, exercises] = await Promise.all([
    getWorkoutsByUserId(userId),
    getUserExercises(userId),
  ]);

  return (
    <div>
      <WorkoutsList workouts={workouts} />
      <ExercisesList exercises={exercises} />
    </div>
  );
}
```

---

### Loading States

Use React Suspense for loading states:

```tsx
// app/workouts/page.tsx
import { Suspense } from "react";
import { WorkoutsList } from "@/components/workouts-list";

export default function WorkoutsPage() {
  return (
    <Suspense fallback={<div>Loading workouts...</div>}>
      <WorkoutsContent />
    </Suspense>
  );
}

async function WorkoutsContent() {
  const { userId } = await auth();
  const workouts = await getWorkoutsByUserId(userId);

  return <WorkoutsList workouts={workouts} />;
}
```

---

## Helper Function Patterns

### Read Operations

```typescript
// Single record
export async function getWorkoutById(workoutId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const workout = await db
    .select()
    .from(workouts)
    .where(eq(workouts.id, workoutId))
    .limit(1);

  if (!workout[0]) throw new Error("Workout not found");
  if (workout[0].userId !== userId) throw new Error("Forbidden");

  return workout[0];
}

// Multiple records
export async function getWorkoutsByUserId(userId: string) {
  return await db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, userId))
    .orderBy(desc(workouts.date));
}

// With joins
export async function getWorkoutWithExercises(workoutId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const result = await db
    .select()
    .from(workouts)
    .leftJoin(workoutExercises, eq(workouts.id, workoutExercises.workoutId))
    .leftJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)));

  if (!result[0]) throw new Error("Workout not found");

  return result;
}
```

### Write Operations

```typescript
// Create
export async function createWorkout(data: {
  name: string;
  description?: string;
  date: Date;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [workout] = await db
    .insert(workouts)
    .values({
      userId,
      name: data.name,
      description: data.description,
      date: data.date,
    })
    .returning();

  return workout;
}

// Update
export async function updateWorkout(
  workoutId: string,
  data: Partial<{ name: string; description: string }>
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const existing = await db
    .select()
    .from(workouts)
    .where(eq(workouts.id, workoutId))
    .limit(1);

  if (!existing[0]) throw new Error("Workout not found");
  if (existing[0].userId !== userId) throw new Error("Forbidden");

  const [updated] = await db
    .update(workouts)
    .set(data)
    .where(eq(workouts.id, workoutId))
    .returning();

  return updated;
}

// Delete
export async function deleteWorkout(workoutId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const existing = await db
    .select()
    .from(workouts)
    .where(eq(workouts.id, workoutId))
    .limit(1);

  if (!existing[0]) throw new Error("Workout not found");
  if (existing[0].userId !== userId) throw new Error("Forbidden");

  await db.delete(workouts).where(eq(workouts.id, workoutId));

  return { success: true };
}
```

---

## Anti-Patterns to Avoid

### ❌ DO NOT: Client-Side Fetching

```tsx
// ❌ WRONG - Client Component with useEffect
"use client";
import { useEffect, useState } from "react";

export function WorkoutsList() {
  const [workouts, setWorkouts] = useState([]);

  useEffect(() => {
    fetch("/api/workouts")
      .then((res) => res.json())
      .then(setWorkouts);
  }, []);

  return <div>...</div>;
}
```

### ❌ DO NOT: Direct Database Queries in Components

```tsx
// ❌ WRONG - Direct query in Server Component
import { db } from "@/db";
import { workouts } from "@/db/schema";

export default async function Page() {
  const data = await db.select().from(workouts); // NO!
  return <div>...</div>;
}
```

### ❌ DO NOT: Missing Auth/RLS

```typescript
// ❌ WRONG - No auth check, no RLS
export async function getWorkoutById(workoutId: string) {
  return await db.select().from(workouts).where(eq(workouts.id, workoutId));
}
```

### ❌ DO NOT: Skipping "server-only"

```typescript
// ❌ WRONG - Missing server-only import
import { db } from "@/db";

export async function getWorkouts() {
  return await db.select().from(workouts);
}
```

---

## Summary Checklist

Before creating a data helper:

- [ ] File is in `/data` directory, grouped by domain
- [ ] `"server-only"` imported at the top
- [ ] Using Drizzle ORM for queries
- [ ] Auth check included (`await auth()`)
- [ ] RLS policy enforced (check `userId` ownership)
- [ ] Business logic included where needed
- [ ] Proper TypeScript typing
- [ ] Error handling implemented
- [ ] Function is exported (not default export)

Before fetching data in Server Component:

- [ ] Importing helper from `/data`
- [ ] NOT querying database directly
- [ ] Using `Promise.all` for parallel fetches
- [ ] Using Suspense for loading states
- [ ] Handling auth states properly

---

**Questions?** Refer to:

- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [Next.js Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Clerk Authentication](https://clerk.com/docs)
