-- Add creator_context column to profiles
-- Stores rich narrative summary from onboarding conversation
-- (experience level, target audience, content style, pain points, unique angle)
alter table profiles add column if not exists creator_context text;
