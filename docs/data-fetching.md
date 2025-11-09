# Data Fetching Guidelines

## Core Principles

**ALL data fetching in this application MUST be done via React Server Components (RSC).**

- ❌ **NEVER** use `useEffect` + `fetch` in client components for data fetching
- ❌ **NEVER** use client-side data fetching libraries (SWR, React Query, etc.)
- ✅ **ALWAYS** fetch data in Server Components and pass as props to client components if needed

## Database Query Pattern

### Helper Functions (REQUIRED)

**ALL database queries MUST be encapsulated in helper functions within the `/data` directory.**

Helper functions are **pure data access functions** that accept `userId` as a parameter. Authentication happens in the Server Component, which then passes `userId` to the helper.

```typescript
// ✅ CORRECT: /data/workouts.ts
import { db } from '@/db';
import { workouts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function getWorkoutsByUserId(userId: string) {
  return await db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, userId));
}

export async function getWorkoutById(userId: string, workoutId: string) {
  const [workout] = await db
    .select()
    .from(workouts)
    .where(
      and(
        eq(workouts.id, workoutId),
        eq(workouts.userId, userId) // RLS: user owns this workout
      )
    )
    .limit(1);

  if (!workout) throw new Error('Workout not found');
  return workout;
}
```

### Benefits of Helper Functions

1. **Reusability** - Same query logic across multiple pages/components/contexts
2. **Maintainability** - Single source of truth for queries
3. **Type Safety** - Centralized return types
4. **RLS Enforcement** - Security policies via userId parameter
5. **Testability** - Pure functions, easy to unit test
6. **Flexibility** - Can be used for admin views, background jobs, etc.

## Row-Level Security (RLS) Policy

### General Rule

**EVERY database query MUST enforce user-based access control:**

- **Authentication Required** - All CRUD operations require authenticated user
- **User Isolation** - Users can only read/write data that belongs to them
- **Ownership Verification** - Check `userId` match on every query

### Implementation Pattern

```typescript
// /data/workouts.ts
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { workouts } from '@/db/schema';

// CREATE
export async function createWorkout(userId: string, data: NewWorkout) {
  return await db.insert(workouts).values({
    ...data,
    userId, // ALWAYS set userId on insert
  });
}

// READ (single)
export async function getWorkout(userId: string, id: string) {
  return await db
    .select()
    .from(workouts)
    .where(
      and(
        eq(workouts.id, id),
        eq(workouts.userId, userId) // RLS check
      )
    );
}

// READ (list)
export async function getWorkouts(userId: string) {
  return await db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, userId)); // RLS filter
}

// UPDATE
export async function updateWorkout(userId: string, id: string, data: Partial<Workout>) {
  return await db
    .update(workouts)
    .set(data)
    .where(
      and(
        eq(workouts.id, id),
        eq(workouts.userId, userId) // RLS check
      )
    );
}

// DELETE
export async function deleteWorkout(userId: string, id: string) {
  return await db
    .delete(workouts)
    .where(
      and(
        eq(workouts.id, id),
        eq(workouts.userId, userId) // RLS check
      )
    );
}
```

## Usage in Server Components

**Server Components are responsible for authentication.** They call `auth()` from Clerk, verify the user is authenticated, then pass `userId` to helper functions.

```typescript
// ✅ CORRECT: app/workouts/page.tsx
import { auth } from '@clerk/nextjs/server';
import { getWorkoutsByUserId } from '@/data/workouts';

export default async function WorkoutsPage() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Unauthorized');
  }

  const workouts = await getWorkoutsByUserId(userId);

  return (
    <div>
      {workouts.map((workout) => (
        <WorkoutCard key={workout.id} workout={workout} />
      ))}
    </div>
  );
}
```

```typescript
// ✅ CORRECT: app/workouts/[id]/page.tsx
import { auth } from '@clerk/nextjs/server';
import { getWorkoutById } from '@/data/workouts';

export default async function WorkoutPage({
  params,
}: {
  params: { id: string };
}) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Unauthorized');
  }

  const workout = await getWorkoutById(userId, params.id);

  return <WorkoutDetails workout={workout} />;
}
```

## Error Handling

```typescript
// /data/workouts.ts
export async function getWorkoutById(userId: string, id: string) {
  const [workout] = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, id), eq(workouts.userId, userId)))
    .limit(1);

  if (!workout) throw new Error('Workout not found or access denied');

  return workout;
}

// app/workouts/[id]/page.tsx
import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { getWorkoutById } from '@/data/workouts';

export default async function WorkoutPage({ params }: { params: { id: string } }) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Unauthorized');
  }

  try {
    const workout = await getWorkoutById(userId, params.id);
    return <WorkoutDetails workout={workout} />;
  } catch (error) {
    notFound(); // Shows 404 page
  }
}
```

## File Organization

```
/data
  ├── workouts.ts      # Workout-related queries
  ├── exercises.ts     # Exercise-related queries
  ├── sets.ts          # Set-related queries
  └── users.ts         # User profile queries
```

Each file exports helper functions for specific domain entities.

## Anti-Patterns to Avoid

```typescript
// ❌ WRONG: Direct DB access in component
import { db } from '@/db';
import { workouts } from '@/db/schema';

export default async function Page() {
  const data = await db.select().from(workouts); // Missing RLS!
  return <div>{/* ... */}</div>;
}

// ❌ WRONG: Client-side data fetching
'use client';
import { useEffect, useState } from 'react';

export default function Page() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch('/api/workouts').then(/* ... */); // Use Server Components instead!
  }, []);
}

// ❌ WRONG: No userId parameter
export async function getWorkouts() {
  return await db.select().from(workouts); // Leaks all users' data!
}

// ❌ WRONG: Auth in helper function (less flexible)
import { auth } from '@clerk/nextjs/server';

export async function getWorkouts() {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');
  return await db.select().from(workouts).where(eq(workouts.userId, userId));
  // Can't reuse for admin views, harder to test
}
```

## Summary Checklist

When implementing data fetching:

- [ ] Data fetched in Server Components only
- [ ] Helper function created in `/data` directory
- [ ] Helper function accepts `userId` as parameter (pure function)
- [ ] Drizzle ORM used for all queries
- [ ] Server Component calls `auth()` to get `userId`
- [ ] Server Component throws error if unauthorized
- [ ] Server Component passes `userId` to helper function
- [ ] `userId` filter applied to WHERE clause in helper (RLS)
- [ ] `userId` set on INSERT operations
- [ ] Error handling implemented
- [ ] Types exported from helper functions
