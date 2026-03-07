-- Orianna Database Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
create table if not exists profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  email text not null,
  name text,
  niche text,
  sub_niche text,
  goals text,
  platforms text[] default '{}',
  posting_target integer default 3,
  telegram_chat_id text,
  onboarding_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can view their own profile"
  on profiles for select using (auth.uid() = user_id);

create policy "Users can insert their own profile"
  on profiles for insert with check (auth.uid() = user_id);

create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (user_id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- POSTS
-- ============================================================
create table if not exists posts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  platform text not null check (platform in ('tiktok', 'instagram', 'youtube')),
  url text,
  title text,
  caption text,
  hashtags text[] default '{}',
  views integer default 0,
  likes integer default 0,
  comments integer default 0,
  shares integer default 0,
  saves integer default 0,
  engagement_rate numeric(5,2),
  posted_at timestamptz,
  duration_seconds integer,
  transcript text,
  hook_text text,
  hook_score numeric(3,1),
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  edit_style text,
  thumbnail_description text,
  ai_notes text,
  is_competitor boolean default false,
  competitor_handle text,
  is_trending boolean default false,
  imported_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table posts enable row level security;

create policy "Users can view their own posts"
  on posts for select using (auth.uid() = user_id);

create policy "Users can insert their own posts"
  on posts for insert with check (auth.uid() = user_id);

create policy "Users can update their own posts"
  on posts for update using (auth.uid() = user_id);

create policy "Users can delete their own posts"
  on posts for delete using (auth.uid() = user_id);

create index if not exists posts_user_id_idx on posts(user_id);
create index if not exists posts_platform_idx on posts(platform);
create index if not exists posts_posted_at_idx on posts(posted_at desc);

-- ============================================================
-- SCRIPTS
-- ============================================================
create table if not exists scripts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  topic text not null,
  niche text,
  hook text not null,
  body text not null,
  cta text,
  hashtags text[] default '{}',
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  estimated_duration text,
  status text default 'draft' check (status in ('draft', 'used', 'archived')),
  variants jsonb default '[]',
  created_at timestamptz default now()
);

alter table scripts enable row level security;

create policy "Users can view their own scripts"
  on scripts for select using (auth.uid() = user_id);

create policy "Users can insert their own scripts"
  on scripts for insert with check (auth.uid() = user_id);

create policy "Users can update their own scripts"
  on scripts for update using (auth.uid() = user_id);

create policy "Users can delete their own scripts"
  on scripts for delete using (auth.uid() = user_id);

create index if not exists scripts_user_id_idx on scripts(user_id);
create index if not exists scripts_created_at_idx on scripts(created_at desc);

-- ============================================================
-- COMPETITORS
-- ============================================================
create table if not exists competitors (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  platform text not null check (platform in ('tiktok', 'instagram', 'youtube')),
  handle text not null,
  display_name text,
  follower_count integer,
  avg_views integer,
  notes text,
  last_scraped_at timestamptz,
  created_at timestamptz default now(),
  unique(user_id, platform, handle)
);

alter table competitors enable row level security;

create policy "Users can view their own competitors"
  on competitors for select using (auth.uid() = user_id);

create policy "Users can insert their own competitors"
  on competitors for insert with check (auth.uid() = user_id);

create policy "Users can update their own competitors"
  on competitors for update using (auth.uid() = user_id);

create policy "Users can delete their own competitors"
  on competitors for delete using (auth.uid() = user_id);

-- ============================================================
-- COACH MESSAGES
-- ============================================================
create table if not exists coach_messages (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

alter table coach_messages enable row level security;

create policy "Users can view their own coach messages"
  on coach_messages for select using (auth.uid() = user_id);

create policy "Users can insert their own coach messages"
  on coach_messages for insert with check (auth.uid() = user_id);

create policy "Users can delete their own coach messages"
  on coach_messages for delete using (auth.uid() = user_id);

create index if not exists coach_messages_user_id_idx on coach_messages(user_id);
create index if not exists coach_messages_created_at_idx on coach_messages(created_at asc);

-- ============================================================
-- CONTENT IDEAS
-- ============================================================
create table if not exists content_ideas (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  idea text not null,
  source text,
  niche text,
  status text default 'new' check (status in ('new', 'in_progress', 'done', 'archived')),
  created_at timestamptz default now()
);

alter table content_ideas enable row level security;

create policy "Users can view their own content ideas"
  on content_ideas for select using (auth.uid() = user_id);

create policy "Users can insert their own content ideas"
  on content_ideas for insert with check (auth.uid() = user_id);

create policy "Users can update their own content ideas"
  on content_ideas for update using (auth.uid() = user_id);

create policy "Users can delete their own content ideas"
  on content_ideas for delete using (auth.uid() = user_id);
