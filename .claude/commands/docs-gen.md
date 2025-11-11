---
description: Generate domain-specific documentation with AI assistance
---

**IMPORTANT: You are now in PLAN MODE. Do not write any files until the user approves.**

Generate comprehensive domain-specific documentation for the Lifting Diary project.

## Task

1. **Gather Information:**

   - Use AskUserQuestion tool to ask:
     - Doc filename (will be converted to kebab-case, e.g., "API Routes" → "api-routes.md")
     - What the documentation should cover

2. **Clarification (if needed):**

   - If description is vague or unclear, use AskUserQuestion tool again to gather:
     - Specific standards/patterns to document
     - Key requirements or constraints
     - Examples user wants covered
     - Any anti-patterns to highlight

3. **Documentation Planning Checklist:**

   Before generating content, verify these elements are covered:

   - [ ] Clear title and brief overview (2-3 sentences max)
   - [ ] Core principles/mandatory standards (bullet form)
   - [ ] Concrete ✅ DO / ❌ DON'T examples (code snippets)
   - [ ] Anti-patterns section (what to avoid + why)
   - [ ] Quick reference checklist at end
   - [ ] Related doc links (sparse, only if clarifying)
   - [ ] Project stack context where relevant (Next.js 16, TypeScript, Clerk, Drizzle, shadcn/ui, Tailwind v4)

4. **Generate Documentation:**

   **Writing Style Requirements:**

   - **Prioritize brevity over grammar** - sentence fragments OK
   - **Concise > perfect** - cut filler words aggressively
   - Short sentences, active voice
   - Aim 1,500-3,000 words
   - Self-contained but tight - no unnecessary elaboration
   - Code examples over prose explanations
   - Match existing doc tone/style

5. **Preview & Approval:**

   - Show full generated documentation content
   - Ask user: "Does this look good, or would you like me to make changes?"
   - If changes requested, iterate on content
   - If approved, proceed to step 6

6. **Exit Plan Mode & Write:**

   - Use ExitPlanMode tool to confirm you're ready to write
   - Write documentation to `/docs/<kebab-case-filename>.md`
   - Confirm completion with filepath

7. **Link Documentation in CLAUDE.md:**
   - After successfully writing the file, use the Task tool to invoke the docs-linker agent
   - Provide context that a new documentation file was just created at the path
   - The docs-linker agent will automatically update CLAUDE.md's "Domain-Specific Guidelines" section with a reference to the new doc

## Output File Location

`/docs/<kebab-case-filename>.md`

## Example Usage

```
/docs-gen
```

You'll be prompted to provide:

1. Doc filename (e.g., "API Routes")
2. What the documentation should cover (e.g., "standards for Next.js API routes and server actions")

Creates `/docs/api-routes.md` with comprehensive documentation about API route standards.

---

**Remember:** Stay in plan mode throughout. Only write the file after user approves the preview.
