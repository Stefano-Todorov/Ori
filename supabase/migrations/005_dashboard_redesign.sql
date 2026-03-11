-- 005: Dashboard & Schedule Redesign
-- Adds follower tracking, production status, simplified scheduling, recording days

-- ─── Follower Snapshots (manual tracking) ────────────────────────────────
create table public.follower_snapshots (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  platform text not null check (platform in ('tiktok','instagram','youtube')),
  count integer not null default 0,
  recorded_at date not null default current_date,
  created_at timestamptz default now(),
  unique(user_id, platform, recorded_at)
);
alter table public.follower_snapshots enable row level security;
create policy "Users own follower snapshots"
  on public.follower_snapshots for all using (auth.uid() = user_id);

-- ─── Production status on content_ideas ──────────────────────────────────
alter table public.content_ideas
  add column if not exists production_status text default 'new';
-- Note: check constraint added separately to avoid issues if column exists
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'content_ideas_production_status_check'
  ) then
    alter table public.content_ideas
      add constraint content_ideas_production_status_check
      check (production_status in ('new','recording','editing','posted'));
  end if;
end $$;

-- ─── Simplified scheduled_posts (planning only) ─────────────────────────
drop table if exists public.scheduled_posts;
create table public.scheduled_posts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  content_idea_id uuid references public.content_ideas(id) on delete set null,
  platform text check (platform in ('tiktok','instagram','youtube')),
  title text,
  scheduled_date date not null,
  notes text,
  created_at timestamptz default now()
);
alter table public.scheduled_posts enable row level security;
create policy "Users own scheduled posts"
  on public.scheduled_posts for all using (auth.uid() = user_id);

-- ─── Recording days ─────────────────────────────────────────────────────
create table public.recording_days (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  recording_date date not null,
  notes text,
  created_at timestamptz default now(),
  unique(user_id, recording_date)
);
alter table public.recording_days enable row level security;
create policy "Users own recording days"
  on public.recording_days for all using (auth.uid() = user_id);

-- ─── Recording day ↔ ideas join table ───────────────────────────────────
create table public.recording_day_ideas (
  id uuid default uuid_generate_v4() primary key,
  recording_day_id uuid references public.recording_days(id) on delete cascade not null,
  content_idea_id uuid references public.content_ideas(id) on delete cascade not null,
  unique(recording_day_id, content_idea_id)
);
alter table public.recording_day_ideas enable row level security;
create policy "Users own recording day ideas"
  on public.recording_day_ideas for all using (
    exists (
      select 1 from public.recording_days rd
      where rd.id = recording_day_id and rd.user_id = auth.uid()
    )
  );
