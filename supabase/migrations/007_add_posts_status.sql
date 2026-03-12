-- Add status column to posts table for archiving support
alter table posts add column if not exists status text default 'draft' check (status in ('draft', 'used', 'archived'));

-- Set all existing posts to 'draft' (active)
update posts set status = 'draft' where status is null;
