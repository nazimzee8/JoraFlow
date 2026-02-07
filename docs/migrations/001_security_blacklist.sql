-- 001_security_blacklist.sql
-- Tracks IPs and users flagged for prompt injection or abuse

create table if not exists security_blacklist (
  id uuid primary key default gen_random_uuid(),
  ip_address text not null,
  user_id uuid null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists security_blacklist_ip_idx on security_blacklist (ip_address);
create index if not exists security_blacklist_user_idx on security_blacklist (user_id);
