-- Real, cross-device backend for स्वस्थ Bharat Connect.
-- Everything else in this app is local-only (Zustand + localStorage); this
-- is the one real, shared backend, keyed by app_users.email (the same
-- identity key the existing local auth already uses).
--
-- "connection" is the one entity for what a user-facing "Add/Find Friend"
-- creates — there is no separate "friend" concept. A connection unlocks
-- 1:1 chat once accepted.

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  code text unique not null, -- short, shareable code, e.g. "SB-7K2QAF"
  created_at timestamptz not null default now()
);

-- Migrate forward from the earlier email-keyed friend_requests table, if
-- it's still around, instead of dropping real user data.
do $$
begin
  if to_regclass('public.friend_requests') is not null
     and to_regclass('public.connections') is null then
    alter table friend_requests rename to connections;
    alter table connections add column if not exists requester_id uuid;
    alter table connections add column if not exists receiver_id uuid;
    update connections c set requester_id = u.id from app_users u where u.email = c.requester_email;
    update connections c set receiver_id = u.id from app_users u where u.email = c.receiver_email;
    alter table connections alter column requester_id set not null;
    alter table connections alter column receiver_id set not null;
    alter table connections drop column requester_email;
    alter table connections drop column receiver_email;
    alter table connections drop constraint if exists friend_requests_status_check;
    alter table connections add constraint connections_requester_receiver_key unique (requester_id, receiver_id);
  end if;
end $$;

create table if not exists connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references app_users(id) on delete cascade,
  receiver_id uuid not null references app_users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'blocked')),
  source text not null default 'search' check (source in ('search', 'find_a_friend')),
  activity_id uuid, -- nullable; references activities(id) once Milestone 2 adds that table
  created_at timestamptz not null default now(),
  unique (requester_id, receiver_id)
);

alter table connections add column if not exists source text not null default 'search';
alter table connections add column if not exists activity_id uuid;
alter table connections drop constraint if exists connections_source_check;
alter table connections add constraint connections_source_check check (source in ('search', 'find_a_friend'));
alter table connections drop constraint if exists connections_status_check;
alter table connections add constraint connections_status_check check (status in ('pending', 'accepted', 'declined', 'blocked'));

create index if not exists connections_receiver_idx on connections(receiver_id);
create index if not exists connections_requester_idx on connections(requester_id);

-- 1:1 chat, unlocked only once a connection's status = 'accepted'.
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references connections(id) on delete cascade,
  sender_id uuid not null references app_users(id) on delete cascade,
  type text not null default 'text' check (type in ('text', 'celebration')),
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists messages_connection_idx on messages(connection_id, created_at);
