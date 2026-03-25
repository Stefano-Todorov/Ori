---
name: db-migrate
description: Create a new Supabase migration SQL file following the project's naming convention
disable-model-invocation: true
---

Create a new database migration for: $ARGUMENTS

1. Read existing migrations in `supabase/migrations/` to understand naming conventions
2. Read `supabase/schema.sql` for current schema context
3. Create a new migration file in `supabase/migrations/` with a descriptive name
   - Use format: `NNN_description.sql` where NNN is the next number in sequence
   - Or use a descriptive name like `add_<feature>.sql` matching existing patterns

4. The migration SQL should:
   - Use `IF NOT EXISTS` for new tables/columns to be idempotent
   - Include Row Level Security (RLS) policies for any new tables
   - Add appropriate indexes for frequently queried columns
   - Include comments explaining the purpose of changes

5. If adding columns to existing tables, use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`

6. After creating the migration, remind the user to:
   - Run the SQL in Supabase SQL Editor (Dashboard > SQL Editor > New query)
   - Update `supabase/schema.sql` if this is a significant schema change
