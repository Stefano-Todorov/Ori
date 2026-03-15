-- ============================================================
-- SUBSCRIPTIONS & USAGE TRACKING
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Add subscription columns to profiles
alter table profiles
  add column if not exists subscription_tier text default 'explorer'
    check (subscription_tier in ('explorer', 'creator', 'pro', 'studio')),
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_subscription_id text unique;

-- ============================================================
-- USAGE TABLE — tracks per-feature monthly usage
-- ============================================================
create table if not exists usage (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  feature text not null,
  period text not null, -- YYYY-MM format for monthly reset
  count integer default 0,
  updated_at timestamptz default now(),
  unique(user_id, feature, period)
);

alter table usage enable row level security;

create policy "Users can view their own usage"
  on usage for select using (auth.uid() = user_id);

create policy "Users can insert their own usage"
  on usage for insert with check (auth.uid() = user_id);

create policy "Users can update their own usage"
  on usage for update using (auth.uid() = user_id);

create index if not exists usage_user_period_idx on usage(user_id, period);
create index if not exists usage_user_feature_period_idx on usage(user_id, feature, period);

-- ============================================================
-- HELPER: Increment usage (called from server)
-- ============================================================
create or replace function increment_usage(
  p_user_id uuid,
  p_feature text,
  p_period text
)
returns integer as $$
declare
  new_count integer;
begin
  insert into usage (user_id, feature, period, count, updated_at)
  values (p_user_id, p_feature, p_period, 1, now())
  on conflict (user_id, feature, period)
  do update set count = usage.count + 1, updated_at = now()
  returning count into new_count;
  return new_count;
end;
$$ language plpgsql security definer;
