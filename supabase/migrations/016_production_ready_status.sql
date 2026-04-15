-- Add 'ready' (ready to post) to production_status check constraint
alter table content_ideas
  drop constraint if exists content_ideas_production_status_check;

alter table content_ideas
  add constraint content_ideas_production_status_check
  check (production_status in ('new','recording','editing','ready','posted'));
