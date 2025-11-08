# UI Coding Standards

This document outlines the UI coding standards for the Lifting Diary project.

## Component Standards

### shadcn/ui Components Only

**MANDATORY:** All UI components in this project MUST use shadcn/ui components.

- ✅ **DO:** Use shadcn/ui components for all UI elements
- ✅ **DO:** Install new shadcn components when needed via CLI
- ❌ **DO NOT:** Create custom UI components unless absolutely necessary
- ❌ **DO NOT:** Recreate functionality that exists in shadcn/ui

### Installing shadcn Components

If a shadcn component is not yet installed, install it:

```bash
npx shadcn@latest add [component-name]
```

**Examples:**

```bash
npx shadcn@latest add card
npx shadcn@latest add input
npx shadcn@latest add form
npx shadcn@latest add table
```

Browse available components: [shadcn/ui components](https://ui.shadcn.com/docs/components)

### When Custom Components Are Allowed

Custom components are ONLY allowed when:

1. **Composing shadcn components** (e.g., `ModeToggle` using `Button` + `DropdownMenu`)
2. **Business logic wrappers** that use shadcn components internally
3. **Absolutely necessary** and no shadcn alternative exists

**Never** create custom versions of existing shadcn components (buttons, inputs, cards, etc.)

## Custom Component Conventions

When creating custom components (composing shadcn components or adding business logic), follow these conventions:

### File Naming

**MANDATORY:** Use kebab-case for component file names.

- ✅ **DO:** `date-picker-card.tsx`, `workout-summary.tsx`, `exercise-form.tsx`
- ❌ **DO NOT:** `DatePickerCard.tsx`, `WorkoutSummary.tsx`, `ExerciseForm.tsx`

### Component Export

**MANDATORY:** Use named exports with PascalCase component names.

```tsx
// ✅ CORRECT - Named export
export function DatePickerCard({ date, onDateChange }: DatePickerCardProps) {
  return <Card>...</Card>;
}

// ❌ INCORRECT - Default export
export default function DatePickerCard({
  date,
  onDateChange,
}: DatePickerCardProps) {
  return <Card>...</Card>;
}
```

### PropType Convention

**MANDATORY:** Define PropTypes with `ComponentNameProps` pattern. Do NOT export PropTypes.

```tsx
// ✅ CORRECT - Internal PropType, not exported
type DatePickerCardProps = {
  date: Date;
  onDateChange: (date: Date) => void;
  className?: string;
};

export function DatePickerCard({
  date,
  onDateChange,
  className,
}: DatePickerCardProps) {
  return <Card className={cn("p-4", className)}>...</Card>;
}

// ❌ INCORRECT - Exported PropType
export type DatePickerCardProps = {
  date: Date;
  onDateChange: (date: Date) => void;
};
```

### File Location

**MANDATORY:** Custom components MUST live in the `/components` directory (NOT in `/components/ui`).

```
components/
├── ui/                       # shadcn components only (auto-generated)
│   ├── button.tsx
│   ├── card.tsx
│   └── ...
├── date-picker-card.tsx      # ✅ Custom component
├── workout-summary.tsx       # ✅ Custom component
└── theme-provider.tsx        # ✅ Custom component
```

The `/components/ui` directory is reserved exclusively for shadcn-generated components.

## Date Formatting Standards

### Required Library

**MANDATORY:** Use `date-fns` for all date formatting operations.

```bash
npm install date-fns
```

### Date Format Specification

All dates MUST be formatted with ordinal day + short month + full year:

**Format:** `1st Sep 2025`, `2nd Aug 2025`, `3rd Jan 2024`, `4th Jun 2024`

### Implementation

```typescript
import { format } from "date-fns";

// Helper function for ordinal suffix
function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

// Format date with ordinal
function formatDate(date: Date): string {
  const day = date.getDate();
  const ordinal = getOrdinalSuffix(day);
  return `${day}${ordinal} ${format(date, "MMM yyyy")}`;
}

// Usage
const formattedDate = formatDate(new Date("2025-09-01")); // "1st Sep 2025"
```

**Recommended:** Create a utility function in `@/lib/utils.ts` or `@/lib/date-utils.ts` for consistent date formatting across the app.

## Theming Standards

### Leverage Light/Dark Themes

**MANDATORY:** Always use the theme system. Never hardcode colors or styles.

- ✅ **DO:** Use CSS variable tokens from `globals.css`
- ✅ **DO:** Leverage Tailwind theme classes
- ❌ **DO NOT:** Hardcode colors (hex, rgb, hsl) in components
- ❌ **DO NOT:** Bypass the theme system

### Available Theme Tokens

Reference these CSS variables (defined in `app/globals.css`):

**Core Colors:**

- `--background`, `--foreground`
- `--card`, `--card-foreground`
- `--popover`, `--popover-foreground`
- `--primary`, `--primary-foreground`
- `--secondary`, `--secondary-foreground`
- `--muted`, `--muted-foreground`
- `--accent`, `--accent-foreground`
- `--destructive`, `--destructive-foreground`

**Borders & Inputs:**

- `--border`, `--input`, `--ring`

**Chart Colors:**

- `--chart-1` through `--chart-5`

**Sidebar:**

- `--sidebar-background`, `--sidebar-foreground`
- `--sidebar-primary`, `--sidebar-primary-foreground`
- `--sidebar-accent`, `--sidebar-accent-foreground`
- `--sidebar-border`, `--sidebar-ring`

### Using Theme Colors

```tsx
// ✅ CORRECT - Using Tailwind theme classes
<div className="bg-background text-foreground">
  <p className="text-muted-foreground">Muted text</p>
  <Button variant="destructive">Delete</Button>
</div>

// ❌ INCORRECT - Hardcoded colors
<div className="bg-white text-black dark:bg-gray-900 dark:text-white">
  <p className="text-gray-500">Muted text</p>
  <Button className="bg-red-600">Delete</Button>
</div>
```

### Theme Provider

The app uses `next-themes` for theme management. Theme is configured in `app/layout.tsx`:

```tsx
import { ThemeProvider } from "@/components/theme-provider";

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

## Styling Utilities

### Class Name Merging

**MANDATORY:** Use the `cn()` utility from `@/lib/utils.ts` for merging class names.

```typescript
import { cn } from '@/lib/utils';

// ✅ CORRECT
<div className={cn("base-class", conditional && "conditional-class", className)} />

// ❌ INCORRECT - String concatenation
<div className={`base-class ${conditional ? "conditional-class" : ""} ${className}`} />
```

The `cn()` utility intelligently merges Tailwind classes and prevents conflicts.

## Component Architecture

### Path Aliases

Use configured path aliases:

```typescript
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { db } from "@/db";
```

### TypeScript

All components MUST be TypeScript with proper typing:

```tsx
interface MyComponentProps {
  title: string;
  isActive?: boolean;
  onClick?: () => void;
}

export function MyComponent({
  title,
  isActive = false,
  onClick,
}: MyComponentProps) {
  return (
    <Button variant={isActive ? "default" : "outline"} onClick={onClick}>
      {title}
    </Button>
  );
}
```

### Component Variants

Use Class Variance Authority (CVA) for component variants (shadcn components use this internally):

```typescript
import { cva, type VariantProps } from "class-variance-authority";

const variants = cva("base-classes", {
  variants: {
    variant: {
      default: "default-classes",
      primary: "primary-classes",
    },
    size: {
      sm: "small-classes",
      lg: "large-classes",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "sm",
  },
});
```

## Icons

**MANDATORY:** Use Lucide icons only.

```tsx
import { Calendar, User, Settings } from "lucide-react";

<Button>
  <Calendar className="mr-2 h-4 w-4" />
  Schedule
</Button>;
```

## Component File Structure

```
components/
├── ui/                    # shadcn components (auto-generated)
│   ├── button.tsx
│   ├── dropdown-menu.tsx
│   └── ...
├── mode-toggle.tsx        # Custom composition component
└── theme-provider.tsx     # Theme wrapper
```

## Summary Checklist

Before creating any UI component:

- [ ] Does a shadcn component exist for this? → Use it
- [ ] Do I need a new shadcn component? → Install it via CLI
- [ ] Am I creating a custom component?
  - [ ] Is the filename kebab-case?
  - [ ] Is it in `/components` (not `/components/ui`)?
  - [ ] Am I using named export (not default)?
  - [ ] Are PropTypes named `ComponentNameProps` and NOT exported?
- [ ] Am I using theme tokens? → No hardcoded colors
- [ ] Am I using `cn()` for class merging?
- [ ] Am I formatting dates with date-fns in the correct format?
- [ ] Is my component TypeScript with proper types?
- [ ] Am I using Lucide icons?
- [ ] Am I using path aliases (`@/*`)?

---

**Questions?** Refer to:

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [date-fns Documentation](https://date-fns.org)
- [Tailwind CSS v4 Documentation](https://tailwindcss.com)
