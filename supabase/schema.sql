-- Summer Showdown: Supabase schema
-- Run this in the Supabase SQL editor for a fresh project.

-- ---------------------------------------------------------------------------
-- 1. Games lookup table
--    A fixed, admin-managed list of games avoids free-text typos splitting
--    the "Least Time" groupings on the dashboard.
-- ---------------------------------------------------------------------------
create table if not exists ss_games (
  name text primary key
);

-- Seed with your event's games (edit as needed).
insert into ss_games (name) values
  ('Tug of War'),
  ('Relay Race'),
  ('Obstacle Course')
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Teams table (was "SS_registration" in the original spec)
--    completion_time is stored as elapsed SECONDS from the stopwatch, not a
--    timestamp -- a stopwatch naturally produces a duration, and a single
--    column can't cleanly represent both a duration and a point in time.
--    status + queued_at give the dashboard something to order "Next Turn" by,
--    which a completion_time-only schema has no basis for.
-- ---------------------------------------------------------------------------
create table if not exists ss_teams (
  team_id text primary key,                 -- short human-readable code, e.g. "SS-4F2A"
  team_name text not null,
  game_name text not null references ss_games(name),
  status text not null default 'registered'
    check (status in ('registered', 'in_progress', 'completed')),
  completion_time integer,                  -- elapsed seconds; null until submitted
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists ss_teams_game_status_idx on ss_teams (game_name, status);
create index if not exists ss_teams_game_completion_idx on ss_teams (game_name, completion_time);

-- Team names must be unique across every team, regardless of game --
-- enforced case-insensitively so "Serial Killer" and "serial killer"
-- collide, matching the app-level check in RegistrationTab.jsx.
create unique index if not exists ss_teams_team_name_lower_key
  on ss_teams (lower(team_name));

-- ---------------------------------------------------------------------------
-- 3. Employee IDs are NOT stored.
--    Company legal policy: employee IDs (SIDs) must not be persisted. They
--    are collected at registration and encoded into the team's QR code, so
--    the scan station reads them from the QR itself. There is deliberately
--    no team-members table.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 4. Row Level Security
--    This is scoped as an internal event tool with no per-user auth (per
--    project decisions). RLS is still enabled with explicit permissive
--    policies for the anon key, rather than left off entirely, so tightening
--    access later (e.g. to a shared event PIN) doesn't require a schema
--    change -- only swapping these policies.
-- ---------------------------------------------------------------------------
alter table ss_games enable row level security;
alter table ss_teams enable row level security;

create policy "public read games" on ss_games for select using (true);

create policy "public read teams" on ss_teams for select using (true);
create policy "public insert teams" on ss_teams for insert with check (true);
create policy "public update teams" on ss_teams for update using (true);

-- ---------------------------------------------------------------------------
-- 5. Realtime
--    Needed so the dashboard's "Least Time" / "Next Turn" columns update
--    live as scans come in, instead of requiring a manual refresh.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table ss_teams;
