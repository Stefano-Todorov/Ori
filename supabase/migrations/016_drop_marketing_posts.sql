-- Drop the marketing_posts table — the internal marketing draft pipeline
-- (Claude → Telegram → manual approve → Twitter/Reddit) was removed.
-- Run this in the Supabase SQL Editor.

drop table if exists marketing_posts;
