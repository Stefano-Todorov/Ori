-- 006: Add thumbnail_url to content_ideas
-- Stores video thumbnail for ideas created from the extension

ALTER TABLE public.content_ideas ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
