-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users profile (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  name text,
  niche text,
  sub_niche text,
  goals text,
  platforms text[] default '{}',
  posting_target integer default 3, -- posts per week
  telegram_chat_id text,
  onboarding_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Social accounts linked
create table public.social_accounts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  platform text not null check (platform in ('tiktok', 'instagram', 'youtube')),
  username text not null,
  follower_count integer default 0,
  connected_at timestamptz default now(),
  unique(user_id, platform, username)
);

-- Posts (your own + competitor)
create table public.posts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
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
  -- AI analysis fields
  transcript text,
  hook_text text,
  hook_score integer check (hook_score between 1 and 10),
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  edit_style text,
  thumbnail_description text,
  ai_notes text,
  -- Competitor tracking
  is_competitor boolean default false,
  competitor_handle text,
  is_trending boolean default false,
  -- Meta
  imported_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Generated scripts
create table public.scripts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
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

-- Content ideas
create table public.content_ideas (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  idea text not null,
  source text, -- 'ai', 'trending', 'manual'
  niche text,
  status text default 'new' check (status in ('new', 'in_progress', 'done', 'archived')),
  created_at timestamptz default now()
);

-- Competitors
create table public.competitors (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
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

-- Notifications / coaching messages log
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('reminder', 'weekly_digest', 'milestone', 'coaching', 'repost_suggestion')),
  message text not null,
  channel text not null check (channel in ('email', 'telegram', 'in_app')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz default now()
);

-- Coach conversation history
create table public.coach_messages (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.social_accounts enable row level security;
alter table public.posts enable row level security;
alter table public.scripts enable row level security;
alter table public.content_ideas enable row level security;
alter table public.competitors enable row level security;
alter table public.notifications enable row level security;
alter table public.coach_messages enable row level security;

-- RLS Policies (users can only see their own data)
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

create policy "Users own their social accounts" on public.social_accounts for all using (auth.uid() = user_id);
create policy "Users own their posts" on public.posts for all using (auth.uid() = user_id);
create policy "Users own their scripts" on public.scripts for all using (auth.uid() = user_id);
create policy "Users own their ideas" on public.content_ideas for all using (auth.uid() = user_id);
create policy "Users own their competitors" on public.competitors for all using (auth.uid() = user_id);
create policy "Users own their notifications" on public.notifications for all using (auth.uid() = user_id);
create policy "Users own their coach messages" on public.coach_messages for all using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Updated_at trigger for profiles
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure public.handle_updated_at();
