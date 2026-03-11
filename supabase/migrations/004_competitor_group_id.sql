-- Add group_id to competitors for cross-platform account linking
-- Competitors sharing the same group_id represent the same creator

ALTER TABLE public.competitors
  ADD COLUMN group_id uuid;

-- Backfill: give every existing competitor its own unique group_id
-- (Must use UPDATE, not DEFAULT, because ADD COLUMN DEFAULT evaluates once for all rows)
UPDATE public.competitors SET group_id = gen_random_uuid();

-- Now make it NOT NULL so every competitor always has a group
ALTER TABLE public.competitors ALTER COLUMN group_id SET NOT NULL;

-- Index for efficient group lookups
CREATE INDEX idx_competitors_user_group ON public.competitors(user_id, group_id);
