-- Summer Showdown: allow the same employee ID to register for multiple
-- different games, while still blocking a duplicate within the SAME game.
--
-- The original schema had `eid text not null unique` on ss_team_members,
-- a *global* uniqueness constraint. That's stricter than the actual rule
-- ("one entry per employee per game") and silently blocked legitimate
-- registrations for a second game, no matter what the application-level
-- check in RegistrationTab.jsx decided.
--
-- Fix: denormalize game_name onto ss_team_members (so a composite unique
-- constraint can reference it directly -- ss_team_members has no other
-- way to know which game a row belongs to without joining ss_teams,
-- and Postgres unique constraints can't reference another table) and
-- replace the global unique(eid) with unique(eid, game_name).

alter table ss_team_members
  add column if not exists game_name text references ss_games(name);

-- Backfill game_name for any existing rows from their parent team.
update ss_team_members m
set game_name = t.game_name
from ss_teams t
where m.team_id = t.team_id
  and m.game_name is null;

alter table ss_team_members
  alter column game_name set not null;

-- Drop the old global-uniqueness constraint on eid alone.
alter table ss_team_members
  drop constraint if exists ss_team_members_eid_key;

-- Replace it with: unique per (eid, game_name) -- same employee can join
-- a different game, but not the same game twice.
alter table ss_team_members
  add constraint ss_team_members_eid_game_key unique (eid, game_name);

-- Keep game_name in sync automatically so RegistrationTab.jsx doesn't have
-- to pass it explicitly and can't drift from the parent team's game.
create or replace function ss_team_members_set_game_name()
returns trigger as $$
begin
  select game_name into new.game_name
  from ss_teams
  where team_id = new.team_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists ss_team_members_set_game_name_trg on ss_team_members;
create trigger ss_team_members_set_game_name_trg
  before insert on ss_team_members
  for each row
  execute function ss_team_members_set_game_name();

create index if not exists ss_team_members_eid_idx on ss_team_members (eid);
