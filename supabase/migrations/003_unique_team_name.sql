-- Summer Showdown: team names must be unique across every team (any game).
--
-- ss_teams.team_name had no uniqueness constraint, so two teams -- even in
-- the same game -- could register under the identical name with nothing
-- but app-level checking (which can still race) to stop it.
--
-- Enforced case-insensitively via a unique index on lower(team_name), so
-- "Serial Killer" and "serial killer" count as the same name -- matching
-- the app-level check in RegistrationTab.jsx.
--
-- If duplicate names already exist this will fail; find them with:
--   select lower(team_name), count(*) from ss_teams
--   group by lower(team_name) having count(*) > 1;

create unique index if not exists ss_teams_team_name_lower_key
  on ss_teams (lower(team_name));
