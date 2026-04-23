-- Timezone for localized coach check-in delivery (IANA format, e.g. 'America/New_York')
alter table profiles add column if not exists timezone text default 'America/New_York';

-- Toggle for weekly coach check-ins (default on for paid users)
alter table profiles add column if not exists coach_checkins_enabled boolean default true;
