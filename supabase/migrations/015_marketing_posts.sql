-- Marketing posts table for the automated marketing agent
-- Tracks drafts, approved posts, and posted content across Twitter and Reddit

create table if not exists marketing_posts (
  id uuid primary key default uuid_generate_v4(),
  platform text not null check (platform in ('twitter', 'reddit')),
  content_type text not null,
  content text not null,
  thread_parts text[],
  subreddit text,
  reddit_title text,
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'posted', 'skipped', 'failed')),
  telegram_message_id bigint,
  platform_post_id text,
  platform_post_url text,
  posted_at timestamptz,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- No RLS — admin-only table, accessed via service client
-- Indexes for common queries
create index if not exists marketing_posts_status_idx on marketing_posts(status);
create index if not exists marketing_posts_created_at_idx on marketing_posts(created_at desc);
