-- Feedback / bug reports from users
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'bug' check (type in ('bug', 'feature', 'other')),
  subject text not null,
  description text not null,
  page_url text,
  status text not null default 'new' check (status in ('new', 'reviewed', 'resolved')),
  created_at timestamptz not null default now()
);

-- RLS
alter table public.feedback enable row level security;

-- Users can insert their own feedback
create policy "Users can submit feedback"
  on public.feedback for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Users can read their own feedback
create policy "Users can view own feedback"
  on public.feedback for select
  to authenticated
  using (auth.uid() = user_id);
