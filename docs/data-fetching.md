# Data Fetching Guidelines

## Core Principles

**ALL data fetching in this application MUST be done via React Server Components (RSC).**

- ❌ **NEVER** use `useEffect` + `fetch` in client components for data fetching
- ❌ **NEVER** use client-side data fetching libraries (SWR, React Query, etc.)
- ✅ **ALWAYS** fetch data in Server Components and pass as props to client components if needed

## Database Query Pattern

### Helper Functions (REQUIRED)

**ALL database queries MUST be encapsulated in helper functions within the `/data` directory.**

```typescript
// ✅ CORRECT: /data/workouts.ts
import { db } from '@/db';
import { workouts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

export async function getWorkoutsByUser() {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  return await db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, userId));
}

export async function getWorkoutById(workoutId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

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

1. **Reusability** - Same query logic across multiple pages/components
2. **Maintainability** - Single source of truth for queries
3. **Type Safety** - Centralized return types
4. **RLS Enforcement** - Security policies in one place
5. **Testability** - Easy to unit test data access layer

## Row-Level Security (RLS) Policy

### General Rule

**EVERY database query MUST enforce user-based access control:**

- **Authentication Required** - All CRUD operations require authenticated user
- **User Isolation** - Users can only read/write data that belongs to them
- **Ownership Verification** - Check `userId` match on every query

### Implementation Pattern

```typescript
import { auth } from '@clerk/nextjs/server';
import { eq, and } from 'drizzle-orm';

// CREATE
export async function createWorkout(data: NewWorkout) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  return await db.insert(workouts).values({
    ...data,
    userId, // ALWAYS set userId on insert
  });
}

// READ (single)
export async function getWorkout(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

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
export async function getWorkouts() {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  return await db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, userId)); // RLS filter
}

// UPDATE
export async function updateWorkout(id: string, data: Partial<Workout>) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

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
export async function deleteWorkout(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

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

```typescript
// ✅ CORRECT: app/workouts/page.tsx
import { getWorkoutsByUser } from '@/data/workouts';

export default async function WorkoutsPage() {
  const workouts = await getWorkoutsByUser();

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
import { getWorkoutById } from '@/data/workouts';

export default async function WorkoutPage({
  params,
}: {
  params: { id: string };
}) {
  const workout = await getWorkoutById(params.id);

  return <WorkoutDetails workout={workout} />;
}
```

## Error Handling

```typescript
// /data/workouts.ts
export async function getWorkoutById(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const [workout] = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, id), eq(workouts.userId, userId)))
    .limit(1);

  if (!workout) throw new Error('Workout not found or access denied');

  return workout;
}

// app/workouts/[id]/page.tsx
import { notFound } from 'next/navigation';

export default async function WorkoutPage({ params }: { params: { id: string } }) {
  try {
    const workout = await getWorkoutById(params.id);
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

// ❌ WRONG: No userId check
export async function getWorkouts() {
  return await db.select().from(workouts); // Leaks all users' data!
}
```

## Summary Checklist

When implementing data fetching:

- [ ] Data fetched in Server Components only
- [ ] Helper function created in `/data` directory
- [ ] Drizzle ORM used for all queries
- [ ] `auth()` called to get `userId`
- [ ] Unauthorized access throws error
- [ ] `userId` filter applied to WHERE clause (RLS)
- [ ] `userId` set on INSERT operations
- [ ] Error handling implemented
- [ ] Types exported from helper functions
