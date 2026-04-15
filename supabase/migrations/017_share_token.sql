-- iOS Shortcut / mobile share token. Long-lived, per-user, used by /api/share.
alter table profiles add column if not exists share_token text unique;
create index if not exists profiles_share_token_idx on profiles(share_token);
