# Form Handling Patterns

Comprehensive guide for building forms in the Lifting Diary app using react-hook-form, Zod validation, and Server Actions.

## Core Principles

1. **Forms are Client Components** - All forms must be client components to handle interactivity
2. **Single Source of Truth for Validation** - Define Zod schemas once, reuse in both client and server
3. **Progressive Enhancement** - Forms work without JavaScript, enhanced with client-side validation
4. **Clear Error Communication** - Distinguish between field errors, validation errors, and server errors
5. **Proper Loading States** - Always show loading indicators and disable forms during submission

## Tech Stack

- **react-hook-form** - Form state management and validation
- **Zod** - Schema validation (shared between client and server)
- **useActionState** - Hook for Server Action integration with forms
- **shadcn/ui Form components** - Accessible form UI primitives

## Validation Architecture

### ✅ DO: Share Validation Schemas

Define validation schemas in your helper/Server Action files and export them for reuse:

```typescript
// lib/actions/workouts.ts
import { z } from 'zod';

export const createWorkoutSchema = z.object({
  name: z.string().min(1, 'Workout name is required').max(100),
  date: z.date({ required_error: 'Date is required' }),
  notes: z.string().optional(),
});

export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;

export async function createWorkout(input: CreateWorkoutInput) {
  // Server-side validation
  const validated = createWorkoutSchema.parse(input);

  // ... database logic
}
```

Then reuse in your form component:

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createWorkoutSchema, type CreateWorkoutInput } from '@/lib/actions/workouts';

export function CreateWorkoutForm() {
  const form = useForm<CreateWorkoutInput>({
    resolver: zodResolver(createWorkoutSchema),
    defaultValues: {
      name: '',
      notes: '',
    },
  });

  // ... rest of form
}
```

### ❌ DON'T: Duplicate Validation Logic

```typescript
// ❌ Defining separate validation schemas
'use client';

// Client schema
const clientSchema = z.object({
  name: z.string().min(1),
  // ...
});

// Server has its own schema in actions file - now out of sync!
```

## Form Submission with Server Actions

### ✅ DO: Use useActionState for Server Actions

```typescript
'use client';

import { useActionState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createWorkout, createWorkoutSchema, type CreateWorkoutInput } from '@/lib/actions/workouts';

export function CreateWorkoutForm() {
  const [state, formAction, isPending] = useActionState(createWorkout, null);

  const form = useForm<CreateWorkoutInput>({
    resolver: zodResolver(createWorkoutSchema),
    defaultValues: {
      name: '',
      notes: '',
    },
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    await formAction(data);
  });

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={isPending || form.formState.isSubmitting}>
        {isPending ? 'Creating...' : 'Create Workout'}
      </button>
    </form>
  );
}
```

### ✅ DO: Disable Form During Submission

Always disable form inputs and submit button during submission:

```typescript
<form onSubmit={handleSubmit}>
  <input
    {...register('name')}
    disabled={isPending || form.formState.isSubmitting}
  />

  <button
    type="submit"
    disabled={isPending || form.formState.isSubmitting}
  >
    {isPending ? 'Saving...' : 'Save'}
  </button>
</form>
```

### ✅ DO: Show Loading Indicators

```typescript
<Button type="submit" disabled={isPending}>
  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {isPending ? 'Creating...' : 'Create Workout'}
</Button>
```

## Error Handling

### Error Types

1. **Field Errors** - Validation errors for specific fields (from Zod schema)
2. **Validation Errors** - General validation errors (e.g., "Workout name already exists")
3. **Server Errors** - Unexpected errors (e.g., database connection failed)

### ✅ DO: Separate Error Types in Server Action Response

```typescript
// lib/actions/workouts.ts
export type ActionState = {
  success: boolean;
  fieldErrors?: Partial<Record<keyof CreateWorkoutInput, string>>;
  validationError?: string;
  serverError?: string;
};

export async function createWorkout(
  prevState: ActionState | null,
  input: CreateWorkoutInput
): Promise<ActionState> {
  try {
    // Validate input
    const validated = createWorkoutSchema.safeParse(input);

    if (!validated.success) {
      return {
        success: false,
        fieldErrors: validated.error.flatten().fieldErrors,
      };
    }

    // Check business rules
    const exists = await checkWorkoutExists(validated.data.name);
    if (exists) {
      return {
        success: false,
        validationError: 'A workout with this name already exists',
      };
    }

    // Perform database operation
    await db.insert(workouts).values(validated.data);

    revalidatePath('/workouts');
    return { success: true };

  } catch (error) {
    console.error('Failed to create workout:', error);
    return {
      success: false,
      serverError: 'An unexpected error occurred. Please try again.',
    };
  }
}
```

### ✅ DO: Display Errors Appropriately in UI

```typescript
'use client';

import { useActionState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';

export function CreateWorkoutForm() {
  const [state, formAction, isPending] = useActionState(createWorkout, null);

  const form = useForm<CreateWorkoutInput>({
    resolver: zodResolver(createWorkoutSchema),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => formAction(data))}>
        {/* General validation error */}
        {state?.validationError && (
          <Alert variant="destructive">
            <AlertDescription>{state.validationError}</AlertDescription>
          </Alert>
        )}

        {/* Server error */}
        {state?.serverError && (
          <Alert variant="destructive">
            <AlertDescription>{state.serverError}</AlertDescription>
          </Alert>
        )}

        {/* Field with error */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Workout Name</FormLabel>
              <FormControl>
                <Input {...field} disabled={isPending} />
              </FormControl>
              {/* Field error from react-hook-form */}
              <FormMessage />
              {/* Field error from server */}
              {state?.fieldErrors?.name && (
                <p className="text-sm font-medium text-destructive">
                  {state.fieldErrors.name}
                </p>
              )}
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending}>
          {isPending ? 'Creating...' : 'Create'}
        </Button>
      </form>
    </Form>
  );
}
```

### ❌ DON'T: Mix Error Types

```typescript
// ❌ Don't use generic error property
return { error: 'Something went wrong' }; // Is this validation or server error?

// ❌ Don't return field errors as strings
return { error: 'Name is required' }; // Should be fieldErrors.name
```

## shadcn/ui Form Components

### ✅ DO: Use shadcn/ui Form Primitives

```typescript
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Name</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormDescription>
            The name of your workout
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  </form>
</Form>
```

### ✅ DO: Use Proper Date Inputs

For date fields, use shadcn/ui DatePicker or native date input:

```typescript
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

<FormField
  control={form.control}
  name="date"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Date</FormLabel>
      <Popover>
        <PopoverTrigger asChild>
          <FormControl>
            <Button variant="outline" className="w-full justify-start">
              {field.value ? format(field.value, 'PPP') : 'Pick a date'}
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent>
          <Calendar
            mode="single"
            selected={field.value}
            onSelect={field.onChange}
            disabled={isPending}
          />
        </PopoverContent>
      </Popover>
      <FormMessage />
    </FormItem>
  )}
/>
```

## Complete Example

```typescript
'use client';

import { useActionState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { createWorkout, createWorkoutSchema, type CreateWorkoutInput } from '@/lib/actions/workouts';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function CreateWorkoutForm() {
  const [state, formAction, isPending] = useActionState(createWorkout, null);

  const form = useForm<CreateWorkoutInput>({
    resolver: zodResolver(createWorkoutSchema),
    defaultValues: {
      name: '',
      notes: '',
    },
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    const result = await formAction(data);
    if (result?.success) {
      form.reset();
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Validation Error */}
        {state?.validationError && (
          <Alert variant="destructive">
            <AlertDescription>{state.validationError}</AlertDescription>
          </Alert>
        )}

        {/* Server Error */}
        {state?.serverError && (
          <Alert variant="destructive">
            <AlertDescription>{state.serverError}</AlertDescription>
          </Alert>
        )}

        {/* Name Field */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Workout Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Leg Day"
                  disabled={isPending || form.formState.isSubmitting}
                />
              </FormControl>
              <FormDescription>
                Give your workout a descriptive name
              </FormDescription>
              <FormMessage />
              {state?.fieldErrors?.name && (
                <p className="text-sm font-medium text-destructive">
                  {state.fieldErrors.name}
                </p>
              )}
            </FormItem>
          )}
        />

        {/* Notes Field */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Any additional notes..."
                  disabled={isPending || form.formState.isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isPending || form.formState.isSubmitting}
          className="w-full"
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isPending ? 'Creating Workout...' : 'Create Workout'}
        </Button>
      </form>
    </Form>
  );
}
```

## Anti-Patterns to Avoid

### ❌ DON'T: Validate Only on Client

```typescript
// ❌ Client-only validation
const form = useForm({
  resolver: zodResolver(schema),
});

// Server Action has no validation
export async function createWorkout(data: any) {
  await db.insert(workouts).values(data); // Unsafe!
}
```

### ❌ DON'T: Forget Loading States

```typescript
// ❌ No loading indicator or disabled state
<button type="submit">Submit</button>

// ✅ Proper loading state
<button type="submit" disabled={isPending}>
  {isPending ? 'Submitting...' : 'Submit'}
</button>
```

### ❌ DON'T: Use Generic Error Messages

```typescript
// ❌ Unhelpful error
return { error: 'Failed' };

// ✅ Specific, actionable error
return {
  validationError: 'A workout with this name already exists. Please choose a different name.'
};
```

### ❌ DON'T: Ignore Accessibility

```typescript
// ❌ No label or error association
<input name="email" />

// ✅ Proper accessibility with shadcn/ui
<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl>
        <Input {...field} type="email" />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

## Summary Checklist

Before submitting a form PR, verify:

- [ ] Form is a Client Component (`'use client'`)
- [ ] Using react-hook-form with zodResolver
- [ ] Validation schema exported from Server Action/helper and reused
- [ ] Server Action validates input with safeParse
- [ ] useActionState hook used for form submission
- [ ] Form and button disabled during submission (isPending)
- [ ] Loading indicator shown during submission
- [ ] Errors separated into fieldErrors, validationError, serverError
- [ ] Field errors displayed below relevant inputs
- [ ] General/server errors displayed in Alert component
- [ ] shadcn/ui Form components used (FormField, FormItem, etc.)
- [ ] Proper accessibility (labels, descriptions, error messages)
- [ ] Form resets on successful submission (if applicable)
- [ ] revalidatePath called after successful mutation
