-- Rename tier slugs: explorer→starter, creator→plus, studio→max
-- Pro stays the same

-- Update existing rows
update profiles set subscription_tier = 'starter' where subscription_tier = 'explorer';
update profiles set subscription_tier = 'plus' where subscription_tier = 'creator';
update profiles set subscription_tier = 'max' where subscription_tier = 'studio';

-- Drop old constraint and add new one
alter table profiles drop constraint if exists profiles_subscription_tier_check;
alter table profiles
  add constraint profiles_subscription_tier_check
  check (subscription_tier in ('starter', 'plus', 'pro', 'max'));

-- Update default
alter table profiles alter column subscription_tier set default 'starter';
