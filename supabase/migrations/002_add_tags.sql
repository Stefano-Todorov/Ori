-- Add tags column to posts and content_ideas
alter table posts add column if not exists tags text[] default '{}';
alter table content_ideas add column if not exists tags text[] default '{}';
