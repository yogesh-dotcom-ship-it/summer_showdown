-- Summer Showdown: dummy data for testing the leaderboard.
--
-- Per game (Ball-Top Blitz, Rapid-Roll Rumble, Nine-cup knockout):
--   * 3 completed teams  -> feeds "Least time" (winner) and "Last Played"
--   * 1 in_progress team  -> shows as "Playing" in the queue
--   * 5 registered teams  -> the "In Queue" list ("Next" + "In queue")
--
-- Run this in the Supabase SQL editor. Safe to re-run: it deletes every
-- team whose team_id starts with "SS-DEMO" first (cascades to any child
-- rows), then re-inserts, so re-running just refreshes the demo data.
--
-- Employee IDs are not stored (company legal policy), so this only
-- populates ss_teams.

-- Ensure the three games exist -- harmless if they already do.
insert into ss_games (name) values
  ('Ball-Top Blitz'),
  ('Rapid-Roll Rumble'),
  ('Nine-cup knockout')
on conflict (name) do nothing;

-- Clear any previous run of this seed.
delete from ss_teams where team_id like 'SS-DEMO%';

-- ---------------------------------------------------------------------------
-- Ball-Top Blitz
-- ---------------------------------------------------------------------------
insert into ss_teams (team_id, team_name, game_name, status, completion_time, queued_at, started_at, completed_at) values
  -- completed (winner is whoever has the smallest completion_time)
  ('SS-DEMO01', 'The Cup Crushers',   'Ball-Top Blitz', 'completed', '00:42:315', now() - interval '60 min', now() - interval '58 min', now() - interval '55 min'),
  ('SS-DEMO02', 'Pyramid Scheme',     'Ball-Top Blitz', 'completed', '00:55:080', now() - interval '50 min', now() - interval '47 min', now() - interval '44 min'),
  ('SS-DEMO03', 'Rack Raiders',       'Ball-Top Blitz', 'completed', '00:48:640', now() - interval '40 min', now() - interval '37 min', now() - interval '33 min'),
  -- in progress (shows as "Playing")
  ('SS-DEMO04', 'Tower Titans',       'Ball-Top Blitz', 'in_progress', null,       now() - interval '30 min', now() - interval '2 min',  null),
  -- registered (the queue: first is "Next", rest are "In queue")
  ('SS-DEMO05', 'Stack Attack',       'Ball-Top Blitz', 'registered', null, now() - interval '25 min', null, null),
  ('SS-DEMO06', 'Cup-tain America',   'Ball-Top Blitz', 'registered', null, now() - interval '24 min', null, null),
  ('SS-DEMO07', 'Ball Busters',       'Ball-Top Blitz', 'registered', null, now() - interval '23 min', null, null),
  ('SS-DEMO08', 'Solo Cup Heroes',    'Ball-Top Blitz', 'registered', null, now() - interval '22 min', null, null),
  ('SS-DEMO09', 'The Restackers',     'Ball-Top Blitz', 'registered', null, now() - interval '21 min', null, null);

-- ---------------------------------------------------------------------------
-- Rapid-Roll Rumble
-- ---------------------------------------------------------------------------
insert into ss_teams (team_id, team_name, game_name, status, completion_time, queued_at, started_at, completed_at) values
  ('SS-DEMO11', 'Roll Models',        'Rapid-Roll Rumble', 'completed', '00:38:927', now() - interval '58 min', now() - interval '56 min', now() - interval '53 min'),
  ('SS-DEMO12', 'Spin Cycle',         'Rapid-Roll Rumble', 'completed', '00:44:210', now() - interval '48 min', now() - interval '45 min', now() - interval '41 min'),
  ('SS-DEMO13', 'Gutter Gang',        'Rapid-Roll Rumble', 'completed', '00:51:775', now() - interval '38 min', now() - interval '35 min', now() - interval '30 min'),
  ('SS-DEMO14', 'Table Titans',       'Rapid-Roll Rumble', 'in_progress', null,       now() - interval '28 min', now() - interval '3 min',  null),
  ('SS-DEMO15', 'Bounce Brigade',     'Rapid-Roll Rumble', 'registered', null, now() - interval '24 min', null, null),
  ('SS-DEMO16', 'The Rollercoasters', 'Rapid-Roll Rumble', 'registered', null, now() - interval '23 min', null, null),
  ('SS-DEMO17', 'Quick Rollers',      'Rapid-Roll Rumble', 'registered', null, now() - interval '22 min', null, null),
  ('SS-DEMO18', 'Nine Ball Alley',    'Rapid-Roll Rumble', 'registered', null, now() - interval '21 min', null, null),
  ('SS-DEMO19', 'Roll With It',       'Rapid-Roll Rumble', 'registered', null, now() - interval '20 min', null, null);

-- ---------------------------------------------------------------------------
-- Nine-cup knockout
-- ---------------------------------------------------------------------------
insert into ss_teams (team_id, team_name, game_name, status, completion_time, queued_at, started_at, completed_at) values
  ('SS-DEMO21', 'Knockout Kings',     'Nine-cup knockout', 'completed', '00:51:204', now() - interval '56 min', now() - interval '54 min', now() - interval '50 min'),
  ('SS-DEMO22', 'Precision Pitchers', 'Nine-cup knockout', 'completed', '00:47:900', now() - interval '46 min', now() - interval '43 min', now() - interval '39 min'),
  ('SS-DEMO23', 'Aim Assassins',      'Nine-cup knockout', 'completed', '01:02:530', now() - interval '36 min', now() - interval '33 min', now() - interval '28 min'),
  ('SS-DEMO24', 'Cup Conquerors',     'Nine-cup knockout', 'in_progress', null,       now() - interval '26 min', now() - interval '1 min',  null),
  ('SS-DEMO25', 'Nine Lives',         'Nine-cup knockout', 'registered', null, now() - interval '22 min', null, null),
  ('SS-DEMO26', 'The Sharpshooters',  'Nine-cup knockout', 'registered', null, now() - interval '21 min', null, null),
  ('SS-DEMO27', 'Bounce Bandits',     'Nine-cup knockout', 'registered', null, now() - interval '20 min', null, null),
  ('SS-DEMO28', 'Rim Shot Rangers',   'Nine-cup knockout', 'registered', null, now() - interval '19 min', null, null),
  ('SS-DEMO29', 'Last Cup Standing',  'Nine-cup knockout', 'registered', null, now() - interval '18 min', null, null);
