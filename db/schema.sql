-- Real, cross-device identity + friend requests for स्वस्थ Bharat Connect.
-- Everything else in this app is local-only (Zustand + localStorage); this
-- is the one real, shared backend table pair, keyed by email (the same
-- identity key the existing local auth already uses).

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  code text unique not null, -- short, shareable friend code, e.g. "SB-7K2QAF"
  created_at timestamptz not null default now()
);

create table if not exists friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_email text not null references app_users(email) on delete cascade,
  receiver_email text not null references app_users(email) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (requester_email, receiver_email)
);

create index if not exists friend_requests_receiver_idx on friend_requests(receiver_email);
create index if not exists friend_requests_requester_idx on friend_requests(requester_email);
