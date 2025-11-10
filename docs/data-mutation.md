# Data Mutation Standards

Comprehensive documentation for data mutation patterns following standards in the Lifting Diary project.

## Core Principles

### Server Actions Only

**MANDATORY:** All data mutations MUST happen via Next.js Server Actions.

- ✅ **DO:** Use Server Actions for mutations (create, update, delete)
- ✅ **DO:** Call helper functions from Server Actions
- ❌ **DO NOT:** Mutate data in Client Components
- ❌ **DO NOT:** Use API routes for mutations
- ❌ **DO NOT:** Mutate database directly in Server Actions

### Helper Function + Server Action Architecture

**MANDATORY:** Data mutations require TWO files:

1. **Helper functions** in `/data/<domain>.ts` (business logic, auth, RLS)
2. **Server actions** in `/data/<domain>.actions.ts` (form handling, validation, revalidation)

**File Structure:**

```
data/
├── workouts.ts              # Read helpers
├── workouts.actions.ts      # Mutation Server Actions
├── exercises.ts             # Read helpers
├── exercises.actions.ts     # Mutation Server Actions
└── ...
```

**Domain Grouping:** Group by domain (workouts, exercises, users, etc.).

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
import { auth } from "@clerk/nextjs/server";

export async function createWorkoutHelper(data: {
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
```

```typescript
// ❌ INCORRECT - Missing server-only
import { db } from "@/db";
import { workouts } from "@/db/schema";

export async function createWorkoutHelper(data: any) {
  return await db.insert(workouts).values(data);
}
```

---

### 2. Drizzle ORM Mutations

**MANDATORY:** Use Drizzle ORM for all mutations.

```typescript
import "server-only";
import { db } from "@/db";
import { workouts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

// ✅ CORRECT - Create with Drizzle
export async function createWorkoutHelper(data: {
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

// ✅ CORRECT - Update with Drizzle
export async function updateWorkoutHelper(
  workoutId: string,
  data: Partial<{ name: string; description: string }>
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // RLS: Check ownership
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

// ✅ CORRECT - Delete with Drizzle
export async function deleteWorkoutHelper(workoutId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // RLS: Check ownership
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

```typescript
// ❌ INCORRECT - Raw SQL
export async function createWorkoutHelper(data: any) {
  return await db.execute(sql`INSERT INTO workouts ...`);
}
```

---

### 3. Business Logic, Auth & RLS

**MANDATORY:** Helpers MUST include business logic, auth checks, and RLS policies.

#### Auth Checks

```typescript
// ✅ CORRECT - Auth check included
export async function updateWorkoutHelper(
  workoutId: string,
  data: { name: string }
) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // RLS: Verify ownership
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
```

```typescript
// ❌ INCORRECT - No auth check
export async function updateWorkoutHelper(workoutId: string, data: any) {
  return await db.update(workouts).set(data).where(eq(workouts.id, workoutId));
}
```

#### RLS Policies

**MANDATORY:** Always verify ownership before mutations.

```typescript
// ✅ CORRECT - RLS enforced
export async function deleteWorkoutHelper(workoutId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // RLS: Ensure user owns the workout
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

```typescript
// ❌ INCORRECT - No RLS check
export async function deleteWorkoutHelper(workoutId: string) {
  await db.delete(workouts).where(eq(workouts.id, workoutId));
  return { success: true };
}
```

#### Business Logic

**RECOMMENDED:** Put validation logic in Zod schemas (see Section 6); keep auth/RLS in helpers.

```typescript
// ✅ CORRECT - Auth & RLS in helper, validation in Zod schema
import type { CreateWorkoutInput } from "./workouts.schemas";

export async function createWorkoutHelper(data: CreateWorkoutInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Data is already validated by Zod schema in Server Action
  // Helper focuses on auth, RLS, and database operations

  const [workout] = await db
    .insert(workouts)
    .values({
      userId,
      ...data,
    })
    .returning();

  return workout;
}
```

**Note:** Business logic validation (like "no future dates") should be in Zod schemas using `.refine()` (see Section 6: Schema Definition with Zod). Helpers should focus on auth, RLS, and database operations.

---

### 4. TypeScript Typing

**MANDATORY:** Use Zod's `z.infer` to derive types from schemas.

```typescript
import "server-only";
import { db } from "@/db";
import { workouts } from "@/db/schema";
import type { Workout } from "@/db/schema";
import type { CreateWorkoutInput, UpdateWorkoutInput } from "./workouts.schemas";

// ✅ CORRECT - Type derived from Zod schema
export async function createWorkoutHelper(
  data: CreateWorkoutInput
): Promise<Workout> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [workout] = await db
    .insert(workouts)
    .values({
      userId,
      ...data,
    })
    .returning();

  return workout;
}

// ✅ CORRECT - Partial updates using Zod schema type
export async function updateWorkoutHelper(
  workoutId: string,
  data: UpdateWorkoutInput
): Promise<Workout> {
  // ... implementation
}
```

**Benefits of `z.infer`:**
- Single source of truth for validation and types
- Types automatically update when schemas change
- No manual type maintenance

---

### 5. Error Handling

**MANDATORY:** Handle errors gracefully.

```typescript
// ✅ CORRECT - Error handling
export async function deleteWorkoutHelper(workoutId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
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

    await db.delete(workouts).where(eq(workouts.id, workoutId));

    return { success: true };
  } catch (error) {
    console.error("Failed to delete workout:", error);
    throw error;
  }
}
```

---

### 6. Schema Definition with Zod

**MANDATORY:** Use Zod for server-side validation in Server Actions.

**Installation:**

```bash
npm install zod
```

#### Basic Schema Definition

Define validation schemas for your data models:

```typescript
// data/workouts.schemas.ts
import { z } from "zod";

// ✅ CORRECT - Zod schema with validation rules
export const createWorkoutSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().optional(),
  date: z.coerce.date(),
  durationMinutes: z.number().positive("Duration must be positive").optional(),
});

export const updateWorkoutSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  durationMinutes: z.number().positive().optional(),
});

// Infer TypeScript types from schemas
export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;
export type UpdateWorkoutInput = z.infer<typeof updateWorkoutSchema>;
```

#### FormData Parsing with Zod

Parse and validate FormData in Server Actions:

```typescript
// ✅ CORRECT - Parse FormData with Zod
export async function createWorkoutAction(formData: FormData) {
  const rawData = {
    name: formData.get("name"),
    description: formData.get("description"),
    date: formData.get("date"),
    durationMinutes: formData.get("durationMinutes")
      ? Number(formData.get("durationMinutes"))
      : undefined,
  };

  const result = createWorkoutSchema.safeParse(rawData);

  if (!result.success) {
    return {
      error: result.error.errors[0].message,
    };
  }

  // result.data is now type-safe
  const workout = await createWorkoutHelper(result.data);
  // ...
}
```

#### Business Logic with Schema Refinements

Use `.refine()` for complex validation rules:

```typescript
// ✅ CORRECT - Business logic in schema
export const createWorkoutSchema = z
  .object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    date: z.coerce.date(),
    durationMinutes: z.number().positive().optional(),
  })
  .refine((data) => data.date <= new Date(), {
    message: "Cannot create workout in the future",
    path: ["date"],
  })
  .refine(
    (data) => {
      if (data.durationMinutes) {
        return data.durationMinutes <= 600; // Max 10 hours
      }
      return true;
    },
    {
      message: "Workout duration cannot exceed 10 hours",
      path: ["durationMinutes"],
    }
  );
```

#### Helper Function Types from Zod

Use Zod schemas to type helper function parameters:

```typescript
import "server-only";
import { db } from "@/db";
import { workouts } from "@/db/schema";
import { auth } from "@clerk/nextjs/server";
import type { CreateWorkoutInput } from "./workouts.schemas";

// ✅ CORRECT - Type derived from Zod schema
export async function createWorkoutHelper(data: CreateWorkoutInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [workout] = await db
    .insert(workouts)
    .values({
      userId,
      ...data,
    })
    .returning();

  return workout;
}
```

---

## Server Action Standards

### File Naming Convention

**MANDATORY:** Server actions MUST be in `<domain>.actions.ts` files.

```
data/
├── workouts.ts              # Helper functions
├── workouts.actions.ts      # Server Actions
├── exercises.ts             # Helper functions
├── exercises.actions.ts     # Server Actions
```

---

### 1. "use server" Directive

**MANDATORY:** Every Server Action file MUST have `"use server"` at the top.

```typescript
// data/workouts.actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createWorkoutHelper, updateWorkoutHelper } from "./workouts";

export async function createWorkoutAction(formData: FormData) {
  // ... implementation
}
```

---

### 2. Server Actions Call Helpers Only

**MANDATORY:** Server Actions MUST call helpers from `<domain>.ts`, NOT mutate database directly.

```typescript
// data/workouts.actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createWorkoutHelper,
  updateWorkoutHelper,
  deleteWorkoutHelper,
} from "./workouts";

// ✅ CORRECT - Calls helper function
export async function createWorkoutAction(formData: FormData) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const date = new Date(formData.get("date") as string);

  try {
    // Call helper function
    const workout = await createWorkoutHelper({
      name,
      description,
      date,
    });

    revalidatePath("/workouts");
    redirect(`/workouts/${workout.id}`);
  } catch (error) {
    console.error("Failed to create workout:", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to create workout",
    };
  }
}

// ✅ CORRECT - Calls helper function
export async function updateWorkoutAction(
  workoutId: string,
  formData: FormData
) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;

  try {
    await updateWorkoutHelper(workoutId, { name, description });

    revalidatePath("/workouts");
    revalidatePath(`/workouts/${workoutId}`);

    return { success: true };
  } catch (error) {
    console.error("Failed to update workout:", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to update workout",
    };
  }
}

// ✅ CORRECT - Calls helper function
export async function deleteWorkoutAction(workoutId: string) {
  try {
    await deleteWorkoutHelper(workoutId);

    revalidatePath("/workouts");
    redirect("/workouts");
  } catch (error) {
    console.error("Failed to delete workout:", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to delete workout",
    };
  }
}
```

```typescript
// ❌ INCORRECT - Mutates database directly
"use server";

import { db } from "@/db";
import { workouts } from "@/db/schema";

export async function createWorkoutAction(formData: FormData) {
  // DON'T DO THIS!
  await db.insert(workouts).values({
    name: formData.get("name"),
    // ...
  });
}
```

---

### 3. Input Validation

**MANDATORY:** Validate and sanitize FormData inputs using Zod.

```typescript
// ✅ CORRECT - Zod validation
import { createWorkoutSchema } from "./workouts.schemas";

export async function createWorkoutAction(formData: FormData) {
  // Extract FormData values
  const rawData = {
    name: formData.get("name"),
    description: formData.get("description"),
    date: formData.get("date"),
  };

  // Validate with Zod
  const result = createWorkoutSchema.safeParse(rawData);

  if (!result.success) {
    // Return first validation error
    return {
      error: result.error.errors[0].message,
    };
  }

  // result.data is now fully type-safe and validated
  try {
    const workout = await createWorkoutHelper(result.data);

    revalidatePath("/workouts");
    redirect(`/workouts/${workout.id}`);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to create workout",
    };
  }
}
```

**Advanced: Multiple Validation Errors**

```typescript
// ✅ CORRECT - Return all validation errors
export async function createWorkoutAction(formData: FormData) {
  const rawData = {
    name: formData.get("name"),
    description: formData.get("description"),
    date: formData.get("date"),
  };

  const result = createWorkoutSchema.safeParse(rawData);

  if (!result.success) {
    // Format all errors
    const errors = result.error.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }));

    return { errors };
  }

  // ... continue with validated data
}
```

```typescript
// ❌ INCORRECT - Manual validation (avoid this)
export async function createWorkoutAction(formData: FormData) {
  const name = formData.get("name") as string;

  // Don't do manual checks!
  if (!name || name.trim().length === 0) {
    return { error: "Name is required" };
  }

  if (name.length > 100) {
    return { error: "Name must be less than 100 characters" };
  }
  // ... more manual checks
}
```

---

### 4. Cache Revalidation

**MANDATORY:** Revalidate affected paths after mutations.

```typescript
import { revalidatePath } from "next/cache";

// ✅ CORRECT - Revalidates paths
export async function updateWorkoutAction(
  workoutId: string,
  formData: FormData
) {
  try {
    await updateWorkoutHelper(workoutId, {
      name: formData.get("name") as string,
    });

    // Revalidate list page
    revalidatePath("/workouts");

    // Revalidate detail page
    revalidatePath(`/workouts/${workoutId}`);

    return { success: true };
  } catch (error) {
    return { error: "Failed to update workout" };
  }
}
```

```typescript
// ❌ INCORRECT - No revalidation
export async function updateWorkoutAction(workoutId: string, data: any) {
  await updateWorkoutHelper(workoutId, data);
  return { success: true }; // Data won't refresh!
}
```

---

### 5. Return Type Convention

**MANDATORY:** Server Actions MUST return either:

- `void` (with `redirect()`)
- `{ success: true }` on success
- `{ error: string }` on error

```typescript
// ✅ CORRECT - Return types
export async function createWorkoutAction(formData: FormData): Promise<void> {
  const workout = await createWorkoutHelper({
    /* ... */
  });
  revalidatePath("/workouts");
  redirect(`/workouts/${workout.id}`); // void return
}

export async function updateWorkoutAction(
  workoutId: string,
  formData: FormData
): Promise<{ success: true } | { error: string }> {
  try {
    await updateWorkoutHelper(workoutId, {
      /* ... */
    });
    revalidatePath("/workouts");
    return { success: true };
  } catch (error) {
    return { error: "Failed to update" };
  }
}
```

---

## Client Component Integration

### Using Server Actions in Forms

```tsx
// components/create-workout-form.tsx
"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createWorkoutAction } from "@/data/workouts.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateWorkoutForm() {
  const [state, formAction] = useFormState(createWorkoutAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">Workout Name</Label>
        <Input id="name" name="name" required />
      </div>

      <div>
        <Label htmlFor="date">Date</Label>
        <Input id="date" name="date" type="date" required />
      </div>

      {state?.error && (
        <div className="text-destructive text-sm">{state.error}</div>
      )}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating..." : "Create Workout"}
    </Button>
  );
}
```

---

### Programmatic Server Action Calls

```tsx
// components/delete-workout-button.tsx
"use client";

import { useState, useTransition } from "react";
import { deleteWorkoutAction } from "@/data/workouts.actions";
import { Button } from "@/components/ui/button";

type DeleteWorkoutButtonProps = {
  workoutId: string;
};

export function DeleteWorkoutButton({ workoutId }: DeleteWorkoutButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteWorkoutAction(workoutId);

      if (result?.error) {
        setError(result.error);
      }
    });
  };

  return (
    <div>
      <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
        {isPending ? "Deleting..." : "Delete"}
      </Button>

      {error && <p className="text-destructive text-sm mt-2">{error}</p>}
    </div>
  );
}
```

---

## Complete Example

### Zod Schemas (`data/workouts.schemas.ts`)

```typescript
import { z } from "zod";

export const createWorkoutSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100, "Name too long"),
    description: z.string().optional(),
    date: z.coerce.date(),
    durationMinutes: z.number().positive("Duration must be positive").optional(),
  })
  .refine((data) => data.date <= new Date(), {
    message: "Cannot create workout in the future",
    path: ["date"],
  });

export const updateWorkoutSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  durationMinutes: z.number().positive().optional(),
});

export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;
export type UpdateWorkoutInput = z.infer<typeof updateWorkoutSchema>;
```

### Helper Functions (`data/workouts.ts`)

```typescript
import "server-only";
import { db } from "@/db";
import { workouts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import type { Workout } from "@/db/schema";
import type { CreateWorkoutInput, UpdateWorkoutInput } from "./workouts.schemas";

export async function createWorkoutHelper(
  data: CreateWorkoutInput
): Promise<Workout> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [workout] = await db
    .insert(workouts)
    .values({
      userId,
      ...data,
    })
    .returning();

  return workout;
}

export async function updateWorkoutHelper(
  workoutId: string,
  data: UpdateWorkoutInput
): Promise<Workout> {
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

export async function deleteWorkoutHelper(workoutId: string): Promise<void> {
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
}
```

### Server Actions (`data/workouts.actions.ts`)

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createWorkoutHelper,
  updateWorkoutHelper,
  deleteWorkoutHelper,
} from "./workouts";
import { createWorkoutSchema, updateWorkoutSchema } from "./workouts.schemas";

export async function createWorkoutAction(formData: FormData): Promise<void> {
  // Extract and validate with Zod
  const rawData = {
    name: formData.get("name"),
    description: formData.get("description"),
    date: formData.get("date"),
    durationMinutes: formData.get("durationMinutes")
      ? Number(formData.get("durationMinutes"))
      : undefined,
  };

  const result = createWorkoutSchema.safeParse(rawData);

  if (!result.success) {
    throw new Error(result.error.errors[0].message);
  }

  const workout = await createWorkoutHelper(result.data);

  revalidatePath("/workouts");
  redirect(`/workouts/${workout.id}`);
}

export async function updateWorkoutAction(
  workoutId: string,
  formData: FormData
): Promise<{ success: true } | { error: string }> {
  try {
    // Extract and validate with Zod
    const rawData = {
      name: formData.get("name"),
      description: formData.get("description"),
      durationMinutes: formData.get("durationMinutes")
        ? Number(formData.get("durationMinutes"))
        : undefined,
    };

    const result = updateWorkoutSchema.safeParse(rawData);

    if (!result.success) {
      return { error: result.error.errors[0].message };
    }

    await updateWorkoutHelper(workoutId, result.data);

    revalidatePath("/workouts");
    revalidatePath(`/workouts/${workoutId}`);

    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update workout",
    };
  }
}

export async function deleteWorkoutAction(
  workoutId: string
): Promise<void | { error: string }> {
  try {
    await deleteWorkoutHelper(workoutId);
    revalidatePath("/workouts");
    redirect("/workouts");
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to delete workout",
    };
  }
}
```

---

## Anti-Patterns to Avoid

### ❌ DO NOT: Mutate in Client Components

```tsx
// ❌ WRONG - Direct mutation in Client Component
"use client";
import { db } from "@/db";

export function MyComponent() {
  const handleClick = async () => {
    await db.insert(workouts).values({
      /* ... */
    }); // NO!
  };
  return <button onClick={handleClick}>Create</button>;
}
```

### ❌ DO NOT: Use API Routes for Mutations

```typescript
// ❌ WRONG - API route for mutation
// app/api/workouts/route.ts
export async function POST(request: Request) {
  const data = await request.json();
  await db.insert(workouts).values(data); // Use Server Actions instead!
  return Response.json({ success: true });
}
```

### ❌ DO NOT: Mutate Directly in Server Actions

```typescript
// ❌ WRONG - Direct mutation in Server Action
"use server";
import { db } from "@/db";

export async function createWorkoutAction(formData: FormData) {
  // DON'T DO THIS!
  await db.insert(workouts).values({
    /* ... */
  });
}
```

### ❌ DO NOT: Skip Revalidation

```typescript
// ❌ WRONG - Missing revalidation
"use server";

export async function updateWorkoutAction(id: string, data: any) {
  await updateWorkoutHelper(id, data);
  return { success: true }; // Cache won't update!
}
```

### ❌ DO NOT: Skip RLS Checks

```typescript
// ❌ WRONG - No ownership check
export async function deleteWorkoutHelper(workoutId: string) {
  await db.delete(workouts).where(eq(workouts.id, workoutId)); // Security risk!
}
```

---

## Summary Checklist

Before creating Zod schemas:

- [ ] File is in `/data/<domain>.schemas.ts`
- [ ] Zod imported (`import { z } from "zod"`)
- [ ] Schema defined with validation rules
- [ ] Types exported using `z.infer<typeof schema>`
- [ ] Business logic validation added with `.refine()` where needed
- [ ] Custom error messages provided

Before creating mutation helpers:

- [ ] File is in `/data/<domain>.ts`
- [ ] `"server-only"` imported at the top
- [ ] Using Drizzle ORM for mutations
- [ ] Auth check included (`await auth()`)
- [ ] RLS policy enforced (ownership verification)
- [ ] Parameter types derived from Zod schemas (`z.infer`)
- [ ] Proper TypeScript typing for return values
- [ ] Error handling implemented
- [ ] Functions exported (not default)

Before creating Server Actions:

- [ ] File is in `/data/<domain>.actions.ts`
- [ ] `"use server"` directive at the top
- [ ] Zod schema imported from `<domain>.schemas.ts`
- [ ] Using `.safeParse()` to validate FormData
- [ ] Handling validation errors properly
- [ ] Calling helpers from `<domain>.ts` (NOT mutating directly)
- [ ] Proper error handling
- [ ] Cache revalidation with `revalidatePath()`
- [ ] Return type is `void`, `{ success: true }`, or `{ error: string }`
- [ ] Using `redirect()` or returning result appropriately

Before using in Client Components:

- [ ] Using `useFormState` for form actions
- [ ] Using `useFormStatus` for pending states
- [ ] Using `useTransition` for programmatic calls
- [ ] Displaying error states properly
- [ ] Handling loading/pending states

---

**Questions?** Refer to:

- [Zod Documentation](https://zod.dev)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [React useFormState](https://react.dev/reference/react-dom/hooks/useFormState)
- [React useTransition](https://react.dev/reference/react/useTransition)
