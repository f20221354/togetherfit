-- Real, cross-device backend for togetherfit Connect.
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

-- ============================================================
-- Milestone 2: Find a Friend (activity-based matching)
-- ============================================================

-- One row per "I want to do <sport> in <area> at <time>". Location is
-- stored coarse only (lat/lng rounded to ~500 m + a geohash), never exact.
create table if not exists activity_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  sport text not null,
  area_geohash text not null,
  area_lat double precision not null,
  area_lng double precision not null,
  area_label text,
  radius_km double precision not null default 5,
  mode text not null check (mode in ('now', 'scheduled')),
  start_time timestamptz not null,
  status text not null default 'active' check (status in ('active', 'cancelled', 'expired')),
  hidden boolean not null default false,
  last_heartbeat timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists activity_intents_active_idx on activity_intents(sport, status);
create index if not exists activity_intents_user_idx on activity_intents(user_id, status);

create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sport text not null,
  area_geohash text not null,
  area_lat double precision not null,
  area_lng double precision not null,
  mode text not null check (mode in ('now', 'scheduled')),
  start_time timestamptz not null,
  created_by uuid not null references app_users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'expired')),
  created_at timestamptz not null default now()
);

create index if not exists groups_active_idx on groups(sport, status);

create table if not exists group_members (
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references app_users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references app_users(id) on delete cascade,
  reported_id uuid not null references app_users(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);

-- Group chat reuses `messages`: a message belongs to exactly one of a
-- connection (1:1) or a group.
alter table messages alter column connection_id drop not null;
alter table messages add column if not exists group_id uuid references groups(id) on delete cascade;
alter table messages drop constraint if exists messages_target_check;
alter table messages add constraint messages_target_check check ((connection_id is null) <> (group_id is null));
create index if not exists messages_group_idx on messages(group_id, created_at);

-- A Find a Friend request carries the requester's intent, and the
-- receiver can counter with another time.
alter table connections add column if not exists proposed_time timestamptz;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'connections_activity_fk') then
    alter table connections
      add constraint connections_activity_fk foreign key (activity_id) references activity_intents(id) on delete set null;
  end if;
end $$;

-- ============================================================
-- Milestone 3: Milestone celebrations
-- ============================================================

-- One row per completed activity (a workout, or a session logged from a
-- 1:1 or group chat). Milestones are computed from these.
create table if not exists activity_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  sport text not null,
  connection_id uuid references connections(id) on delete set null,
  group_id uuid references groups(id) on delete set null,
  completed_at timestamptz not null default now()
);

create index if not exists activity_sessions_user_idx on activity_sessions(user_id, completed_at);

-- Milestones a user has hit. `ref` scopes per-connection milestones
-- (e.g. 10 sessions with one friend); it's '' for everything else.
create table if not exists milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  key text not null,
  ref text not null default '',
  sport text,
  achieved_at timestamptz not null default now(),
  unique (user_id, key, ref)
);

-- Celebration cards are ephemeral (24h) and the receiver can react once.
alter table messages add column if not exists expires_at timestamptz;
alter table messages add column if not exists reaction text;

-- ============================================================
-- Winter Arc (seasonal event) analytics
-- ============================================================

-- Append-only event log. winter_arc_popup_shown fires on every page load,
-- so this is high-volume by design; nothing is throttled except
-- winter_arc_daily_active (deduped to one row per user per India-time day).
create table if not exists winter_arc_events (
  id bigserial primary key,
  event text not null,
  user_email text not null,
  props jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists winter_arc_events_event_idx on winter_arc_events(event, occurred_at);
create index if not exists winter_arc_events_user_idx on winter_arc_events(user_email, event);

-- ============================================================
-- Server-side auth: email + password, email OTP, sessions
-- ============================================================

-- Rows created before real auth have no password; their owner claims the
-- account by signing up (or resetting the password) and proving the email
-- with an OTP.
alter table app_users add column if not exists password_hash text;
alter table app_users add column if not exists email_verified_at timestamptz;
alter table app_users add column if not exists onboarding_completed_at timestamptz;
alter table app_users add column if not exists wellness_setup jsonb;

-- One row per emailed code. Only an HMAC of the code is stored. `payload`
-- carries a pending signup (name + password hash) until the code is verified.
create table if not exists auth_otps (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  purpose text not null check (purpose in ('signup', 'login', 'reset')),
  code_hash text not null,
  payload jsonb,
  attempts int not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists auth_otps_email_idx on auth_otps(email, purpose, created_at desc);

-- The cookie holds a random token; only its SHA-256 is stored here.
create table if not exists auth_sessions (
  id text primary key,
  user_id uuid not null references app_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  user_agent text,
  ip text
);

create index if not exists auth_sessions_user_idx on auth_sessions(user_id);

-- Fixed-window rate limits, shared by every app instance.
create table if not exists rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count int not null default 0
);

-- ============================================================
-- Realtime chat: paginated history, catch-up after reconnect, safe retries
-- ============================================================

-- Bumped on insert and on every change (reactions), so a client that was
-- offline can ask for "everything that changed since X".
alter table messages add column if not exists updated_at timestamptz not null default now();
-- Generated by the sender's browser; a retried send can't create a duplicate.
alter table messages add column if not exists client_message_id uuid;
create unique index if not exists messages_client_id_idx on messages(sender_id, client_message_id) where client_message_id is not null;

-- Newest-first pages of one conversation, and its changes since a point in time.
create index if not exists messages_connection_page_idx on messages(connection_id, created_at desc, id desc) where connection_id is not null;
create index if not exists messages_connection_updated_idx on messages(connection_id, updated_at) where connection_id is not null;
drop index if exists messages_connection_idx;
-- For the scheduled cleanup of expired celebration cards.
create index if not exists messages_expires_idx on messages(expires_at) where expires_at is not null;

-- ============================================================
-- Trust & profile: photos, gender + mutual comfort preferences, verification
-- ============================================================

-- Self-declared and optional (null = not set / prefer not to say). Used only
-- for matching preferences; never shown to other users.
alter table app_users add column if not exists gender text check (gender in ('woman', 'man', 'nonbinary'));
-- Gender can change at most once every 30 days, so it can't be flipped to slip into women-only matching.
alter table app_users add column if not exists gender_changed_at timestamptz;
-- Who this user is comfortable being matched with. Matching is mutual: both sides must fit.
alter table app_users add column if not exists match_preference text not null default 'anyone'
  check (match_preference in ('anyone', 'women', 'men'));
-- Only match with verified people (mutual: if either side wants it, both must be verified).
alter table app_users add column if not exists verified_only boolean not null default false;
-- Set by automatic selfie verification; cleared when the profile photo changes.
alter table app_users add column if not exists verified_at timestamptz;
-- Option A: by default only accepted friends see your photo; opt in to show it on Find a Friend.
alter table app_users add column if not exists photo_on_radar boolean not null default false;
alter table app_users add column if not exists role text not null default 'user' check (role in ('user', 'admin'));

-- One current profile photo per user, already cleaned (re-encoded WebP, no EXIF/GPS).
-- Stored in Postgres for now (~30 KB each); object storage comes with chat photos.
create table if not exists profile_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references app_users(id) on delete cascade,
  large bytea not null,
  small bytea not null,
  created_at timestamptz not null default now()
);

-- Outcome of each verification attempt. No selfies or face data are stored —
-- only scores and the decision.
create table if not exists verification_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  provider text not null,
  status text not null check (status in ('verified', 'rejected', 'retry')),
  liveness_confidence real,
  similarity real,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists verification_attempts_user_idx on verification_attempts(user_id, created_at desc);

-- Reports get a category and a review state for the admin page.
alter table reports add column if not exists category text not null default 'other'
  check (category in ('other', 'photo', 'gender', 'harassment', 'spam', 'safety'));
alter table reports add column if not exists resolved_at timestamptz;
alter table reports add column if not exists resolution text;

-- ============================================================
-- Safety restrictions (from reports)
-- ============================================================

-- A restriction never locks anyone out: they can still sign in, see why,
-- export their data and appeal.
--   'radar': hidden from Find a Friend and can't send radar requests
--   'full':  also can't send friend requests or messages, or join/create groups
alter table app_users add column if not exists restricted_until timestamptz;
alter table app_users add column if not exists restriction_scope text check (restriction_scope in ('radar', 'full'));
alter table app_users add column if not exists restriction_reason text;
-- Escalation: 1st full restriction 7 days, 2nd 30 days, 3rd permanent.
alter table app_users add column if not exists strikes int not null default 0;

-- ============================================================
-- Account editing: email change codes
-- ============================================================
alter table auth_otps drop constraint if exists auth_otps_purpose_check;
alter table auth_otps add constraint auth_otps_purpose_check check (purpose in ('signup', 'login', 'reset', 'email_change'));

-- Celebration reactions are stored by key ("fire"), not as emoji characters.
update messages set reaction = case reaction
  when '🔥' then 'fire' when '👏' then 'clap' when '💪' then 'strong' when '❤️' then 'love' when '🎉' then 'party' else reaction end
where reaction in ('🔥', '👏', '💪', '❤️', '🎉');

-- ============================================================
-- Wellness, workouts, goals and settings, synced from the browser
-- ============================================================
-- One JSON document per app store (the browser keeps a cache). `revision`
-- goes up by one on every save, so a device with stale data can't silently
-- overwrite newer data: it gets a conflict and catches up first.
create table if not exists user_app_state (
  user_id uuid not null references app_users(id) on delete cascade,
  store text not null,
  data jsonb not null,
  revision int not null default 1,
  updated_at timestamptz not null default now(),
  primary key (user_id, store)
);
