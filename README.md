# Summer Showdown

Registration, QR check-in/stopwatch timing, and a live leaderboard dashboard for
a team event. React + Vite, Ant Design, Supabase.

## Setup

1. **Create the Supabase backend**
   - Create a new Supabase project.
   - Open the SQL editor and run `supabase/schema.sql`. It creates:
     - `ss_games` — the list of games (edit the seed `insert` in the file to match your event).
     - `ss_teams` — one row per registered team (`team_id`, `team_name`, `game_name`, `status`, `completion_time` in seconds, `queued_at`, etc).
     - `ss_team_members` — one row per Employee ID, with a global `UNIQUE` constraint so the same person can't end up on two teams.
   - RLS is enabled with permissive policies for the anon key (see note below), and the `ss_teams` table is added to the `supabase_realtime` publication so the dashboard updates live.

2. **Configure environment variables**
   ```
   cp .env.example .env
   ```
   Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from Supabase project settings → API.

3. **Install and run**
   ```
   npm install
   npm run dev
   ```

4. **Camera access for the Scan tab**: browsers only grant camera permission
   on `https://` or `http://localhost`. Deploy behind HTTPS (e.g. Vercel,
   Netlify) for real event use, or use `localhost` for local testing.

## How it's organized

- `src/components/RegistrationTab.jsx` — team registration form, duplicate-EID
  check, team code generation, QR code display.
- `src/components/ScanTab.jsx` — camera QR scan (`html5-qrcode`), team lookup,
  and time submission.
- `src/components/Stopwatch.jsx` — start/pause/reset timer used by the scan tab.
- `src/components/DashboardTab.jsx` — one column per game with "Least Time"
  (completed teams, fastest first) and "Next Turn" (teams not yet completed,
  in queue order), live via Supabase Realtime.
- `supabase/schema.sql` — full schema, RLS policies, and realtime setup.

## Notes on decisions made while building this

- **Employee ID uniqueness** is enforced with a single `UNIQUE` constraint on
  `ss_team_members.eid` (one row per EID) rather than four separate
  `eid_1..eid_4` columns — four independently-unique columns can't prevent
  the same person appearing as, say, `eid_2` on one team and `eid_3` on
  another.
- **`completion_time`** is stored as elapsed seconds (an integer), since a
  stopwatch produces a duration, not a point in time.
- **`status` and `queued_at`** were added to `ss_teams` (not in the original
  spec) because the dashboard's "Next Turn" list needs some basis for
  ordering, and there's otherwise no way to tell a team that hasn't started
  apart from one currently mid-run.
- **No authentication** is implemented — this is scoped as an open internal
  event tool. RLS is still enabled with explicit policies so tightening
  access later (e.g. a shared event PIN) is a policy change, not a schema
  change.
- **Re-timing**: the Scan tab allows overwriting a team's submitted time
  (with a confirmation prompt) rather than making it strictly write-once, in
  case of a mis-scan or timing mistake during the event.
