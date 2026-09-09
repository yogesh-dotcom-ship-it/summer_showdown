-- Summer Showdown: dummy data for testing the leaderboard
-- Per game: 1 completed team (the winner) + 6 teams in queue (registered,
-- not yet scanned in) = 7 teams x 3 games = 21 teams total.
--
-- Run this in the Supabase SQL editor. Safe to re-run: it deletes any team
-- whose team_id starts with "SS-DEMO" first, so re-running just refreshes
-- the same demo rows instead of duplicating them.
--
-- NOTE: SIDs (eid) only need to be unique per game (unique(eid, game_name)),
-- so the same demo SID block is reused across all three games below.

-- Make sure the three games this demo data references actually exist --
-- harmless no-op if they're already there.
insert into ss_games (name) values
  ('Ball-Top Blitz'),
  ('Rapid-Roll Rumble'),
  ('Nine-cup knockout')
on conflict (name) do nothing;

-- Clean up any previous run of this seed script.
delete from ss_teams where team_id like 'SS-DEMO%';

-- ---------------------------------------------------------------------------
-- Ball-Top Blitz
-- ---------------------------------------------------------------------------
insert into ss_teams (team_id, team_name, game_name, status, completion_time, queued_at, started_at, completed_at) values
  ('SS-DEMO01', 'The Cup Crushers',   'Ball-Top Blitz', 'completed', '00:42:315', now() - interval '30 minutes', now() - interval '29 minutes', now() - interval '28 minutes'),
  ('SS-DEMO02', 'Stack Attack',       'Ball-Top Blitz', 'registered', null, now() - interval '20 minutes', null, null),
  ('SS-DEMO03', 'Pyramid Scheme',     'Ball-Top Blitz', 'registered', null, now() - interval '19 minutes', null, null),
  ('SS-DEMO04', 'Tower Titans',       'Ball-Top Blitz', 'registered', null, now() - interval '18 minutes', null, null),
  ('SS-DEMO05', 'Cup-tain America',   'Ball-Top Blitz', 'registered', null, now() - interval '17 minutes', null, null),
  ('SS-DEMO06', 'Rack Raiders',       'Ball-Top Blitz', 'registered', null, now() - interval '16 minutes', null, null),
  ('SS-DEMO07', 'Ball Busters',       'Ball-Top Blitz', 'registered', null, now() - interval '15 minutes', null, null);

insert into ss_team_members (team_id, eid) values
  ('SS-DEMO01', 'I700101'), ('SS-DEMO01', 'I700102'), ('SS-DEMO01', 'I700103'),
  ('SS-DEMO02', 'I700201'), ('SS-DEMO02', 'I700202'), ('SS-DEMO02', 'I700203'),
  ('SS-DEMO03', 'I700301'), ('SS-DEMO03', 'I700302'), ('SS-DEMO03', 'I700303'),
  ('SS-DEMO04', 'I700401'), ('SS-DEMO04', 'I700402'), ('SS-DEMO04', 'I700403'),
  ('SS-DEMO05', 'I700501'), ('SS-DEMO05', 'I700502'), ('SS-DEMO05', 'I700503'),
  ('SS-DEMO06', 'I700601'), ('SS-DEMO06', 'I700602'), ('SS-DEMO06', 'I700603'),
  ('SS-DEMO07', 'I700701'), ('SS-DEMO07', 'I700702'), ('SS-DEMO07', 'I700703');

-- ---------------------------------------------------------------------------
-- Rapid-Roll Rumble
-- ---------------------------------------------------------------------------
insert into ss_teams (team_id, team_name, game_name, status, completion_time, queued_at, started_at, completed_at) values
  ('SS-DEMO11', 'Roll Models',        'Rapid-Roll Rumble', 'completed', '00:38:927', now() - interval '30 minutes', now() - interval '29 minutes', now() - interval '28 minutes'),
  ('SS-DEMO12', 'Gutter Gang',        'Rapid-Roll Rumble', 'registered', null, now() - interval '20 minutes', null, null),
  ('SS-DEMO13', 'Spin Cycle',         'Rapid-Roll Rumble', 'registered', null, now() - interval '19 minutes', null, null),
  ('SS-DEMO14', 'Table Titans',       'Rapid-Roll Rumble', 'registered', null, now() - interval '18 minutes', null, null),
  ('SS-DEMO15', 'Bounce Brigade',     'Rapid-Roll Rumble', 'registered', null, now() - interval '17 minutes', null, null),
  ('SS-DEMO16', 'The Rollercoasters', 'Rapid-Roll Rumble', 'registered', null, now() - interval '16 minutes', null, null),
  ('SS-DEMO17', 'Quick Rollers',      'Rapid-Roll Rumble', 'registered', null, now() - interval '15 minutes', null, null);

insert into ss_team_members (team_id, eid) values
  ('SS-DEMO11', 'I700101'), ('SS-DEMO11', 'I700102'), ('SS-DEMO11', 'I700103'),
  ('SS-DEMO12', 'I700201'), ('SS-DEMO12', 'I700202'), ('SS-DEMO12', 'I700203'),
  ('SS-DEMO13', 'I700301'), ('SS-DEMO13', 'I700302'), ('SS-DEMO13', 'I700303'),
  ('SS-DEMO14', 'I700401'), ('SS-DEMO14', 'I700402'), ('SS-DEMO14', 'I700403'),
  ('SS-DEMO15', 'I700501'), ('SS-DEMO15', 'I700502'), ('SS-DEMO15', 'I700503'),
  ('SS-DEMO16', 'I700601'), ('SS-DEMO16', 'I700602'), ('SS-DEMO16', 'I700603'),
  ('SS-DEMO17', 'I700701'), ('SS-DEMO17', 'I700702'), ('SS-DEMO17', 'I700703');

-- ---------------------------------------------------------------------------
-- Nine-cup knockout
-- ---------------------------------------------------------------------------
insert into ss_teams (team_id, team_name, game_name, status, completion_time, queued_at, started_at, completed_at) values
  ('SS-DEMO21', 'Knockout Kings',     'Nine-cup knockout', 'completed', '00:51:204', now() - interval '30 minutes', now() - interval '29 minutes', now() - interval '28 minutes'),
  ('SS-DEMO22', 'Nine Lives',         'Nine-cup knockout', 'registered', null, now() - interval '20 minutes', null, null),
  ('SS-DEMO23', 'Precision Pitchers', 'Nine-cup knockout', 'registered', null, now() - interval '19 minutes', null, null),
  ('SS-DEMO24', 'Aim Assassins',      'Nine-cup knockout', 'registered', null, now() - interval '18 minutes', null, null),
  ('SS-DEMO25', 'Cup Conquerors',     'Nine-cup knockout', 'registered', null, now() - interval '17 minutes', null, null),
  ('SS-DEMO26', 'The Sharpshooters',  'Nine-cup knockout', 'registered', null, now() - interval '16 minutes', null, null),
  ('SS-DEMO27', 'Bounce Bandits',     'Nine-cup knockout', 'registered', null, now() - interval '15 minutes', null, null);

insert into ss_team_members (team_id, eid) values
  ('SS-DEMO21', 'I700101'), ('SS-DEMO21', 'I700102'), ('SS-DEMO21', 'I700103'),
  ('SS-DEMO22', 'I700201'), ('SS-DEMO22', 'I700202'), ('SS-DEMO22', 'I700203'),
  ('SS-DEMO23', 'I700301'), ('SS-DEMO23', 'I700302'), ('SS-DEMO23', 'I700303'),
  ('SS-DEMO24', 'I700401'), ('SS-DEMO24', 'I700402'), ('SS-DEMO24', 'I700403'),
  ('SS-DEMO25', 'I700501'), ('SS-DEMO25', 'I700502'), ('SS-DEMO25', 'I700503'),
  ('SS-DEMO26', 'I700601'), ('SS-DEMO26', 'I700602'), ('SS-DEMO26', 'I700603'),
  ('SS-DEMO27', 'I700701'), ('SS-DEMO27', 'I700702'), ('SS-DEMO27', 'I700703');
