---
name: new-api
description: Scaffold a new API route following existing patterns with Supabase auth and error handling
disable-model-invocation: true
---

Create a new API route at `src/app/api/$ARGUMENTS/route.ts`:

1. First, read 2-3 existing API routes to understand the patterns:
   - `src/app/api/coach/route.ts` (streaming response pattern)
   - `src/app/api/scripts/generate/route.ts` (JSON response with AI)
   - `src/app/api/posts/upload-csv/route.ts` (file processing pattern)

2. Scaffold the new route following these conventions:
   - Import `createClient` from `@/lib/supabase/server`
   - Authenticate the user at the top of every handler
   - Return proper error responses with appropriate status codes
   - Use TypeScript types from `@/lib/types`
   - Export named functions for HTTP methods: `export async function GET/POST/PUT/DELETE`

3. Standard auth pattern:
   ```ts
   const supabase = await createClient()
   const { data: { user }, error } = await supabase.auth.getUser()
   if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
   ```

4. Add the route to any relevant navigation or API documentation
