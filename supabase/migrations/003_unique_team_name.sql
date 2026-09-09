-- Summer Showdown: team names must be unique across every team (any game).
--
-- ss_teams.team_name had no uniqueness constraint at all, so two teams --
-- even in the same game -- could register under the identical name with
-- nothing but app-level checking (which can still race) to stop it.
--
-- Enforced case-insensitively (via a unique index on lower(team_name)) so
-- "The Sprinters" and "the sprinters" count as the same name -- matching
-- what the app-level check in RegistrationTab.jsx now does.

create unique index if not exists ss_teams_team_name_lower_key
  on ss_teams (lower(team_name));
