-- Add thumbnail_url column to posts table
alter table posts add column if not exists thumbnail_url text;
