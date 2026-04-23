-- Track proactive coaching state
alter table profiles add column if not exists last_proactive_at timestamptz;
alter table profiles add column if not exists unanswered_proactive integer default 0;
alter table profiles add column if not exists last_coach_read_at timestamptz default now();

-- Flag proactive messages
alter table coach_messages add column if not exists proactive boolean default false;
