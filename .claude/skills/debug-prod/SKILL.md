---
name: debug-prod
description: Investigate a production issue using Supabase and Sentry CLIs. Use when debugging errors, data issues, or user-reported bugs.
disable-model-invocation: true
allowed-tools: Bash(npx supabase*), Bash(npx @sentry/cli*), Bash(stripe*), Bash(curl*), Read, Grep, Glob
---

Investigate the production issue: $ARGUMENTS

## Available tools

### Sentry — production errors
```bash
# List recent unresolved issues
npx @sentry/cli issues list --project orianna --status unresolved

# Get details on a specific issue
npx @sentry/cli issues show <ISSUE_ID>
```

### Supabase — database and auth
```bash
# Check current schema
npx supabase db dump --linked

# List migrations
npx supabase migration list --linked

# Query via REST API (uses env vars from .env.local)
# Read .env.local for NEXT_PUBLIC_SUPABASE_URL and the service role key
curl -s "$SUPABASE_URL/rest/v1/TABLE?select=*&limit=5" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

### Stripe — payments (if stripe CLI is installed)
```bash
stripe customers list --limit 5
stripe subscriptions list --status incomplete
stripe logs tail
```
Note: If Stripe CLI is not installed, read the relevant code in `src/lib/stripe.ts` and `src/app/api/stripe/` to understand the payment flow and debug from there.

## Investigation steps

1. **Understand the problem** — Read the user's description of what's wrong
2. **Check Sentry first** — Look for recent unresolved errors matching the symptom
3. **Check the database** — Query relevant tables for bad/missing data
4. **Read the code path** — Trace the relevant code from UI → server action/API → database
5. **Identify root cause** — Pinpoint exactly what's failing and why
6. **Fix it** — Implement the fix in code
7. **Verify** — Run tests or query again to confirm the fix works
