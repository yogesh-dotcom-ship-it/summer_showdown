-- Summer Showdown: allow deleting teams from the admin dashboard.
--
-- ss_teams has RLS enabled with select / insert / update policies but no
-- delete policy. With RLS on and no matching policy, a DELETE succeeds
-- with no error but removes 0 rows -- which is why "Delete" in the admin
-- table appeared to do nothing.

create policy "public delete teams" on ss_teams for delete using (true);
