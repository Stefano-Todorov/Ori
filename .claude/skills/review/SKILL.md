---
name: review
description: Review recent code changes for quality, security, and design system compliance
context: fork
agent: Explore
---

Review the recent code changes in this project:

1. Run `git diff HEAD~1` (or `git diff` for unstaged changes) to see what changed
2. Read all modified files to understand the full context

3. Check for **security issues**:
   - SQL injection or unsanitized user input
   - Missing auth checks on API routes or server actions
   - Exposed secrets or credentials
   - XSS vulnerabilities in rendered content

4. Check for **code quality**:
   - TypeScript types used correctly (no `any` unless justified)
   - Error handling present (not swallowing errors silently)
   - Consistent patterns with the rest of the codebase
   - No dead code or unused imports

5. Check for **design system compliance** (read `DESIGN.md`):
   - Correct colors (no pure black, use #0a0a0f minimum)
   - Proper hover transitions (all 0.2s ease)
   - Purple brand gradient used correctly
   - No native browser date pickers

6. Check for **critical patterns** (read `CLAUDE.md`):
   - Mutations go through server actions, not browser client
   - Profile operations use UPSERT not UPDATE
   - Correct Supabase client used (server vs browser)

Report findings organized by severity: critical > warning > suggestion.
