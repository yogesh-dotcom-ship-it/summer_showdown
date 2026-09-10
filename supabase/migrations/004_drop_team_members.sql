-- Summer Showdown: stop storing employee IDs entirely.
--
-- Company legal policy: employee IDs (SIDs) must not be persisted. They are
-- still collected at registration and printed onto the team's QR code, so
-- the scan station can read them from the QR itself -- but nothing about a
-- player is written to the database.
--
-- ss_teams keeps team_id / team_name / game_name / status / completion_time,
-- which is all the leaderboard and timing need.

drop trigger if exists ss_team_members_set_game_name_trg on ss_team_members;
drop function if exists ss_team_members_set_game_name();
drop table if exists ss_team_members;
