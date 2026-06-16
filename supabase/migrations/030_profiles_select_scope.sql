-- Migration 030: Scope profile reads to authenticated users
--
-- Finding (security audit 2026-06-13): the profiles SELECT policy from migration
-- 002 is `USING (true)` with no role restriction, so the PUBLIC anon key can read
-- the entire profiles table — usernames, display names, levels, XP, and birthdate —
-- without authenticating. The whole app sits behind auth (requireAuth on every
-- route), so no pre-auth flow reads profiles; scoping SELECT to authenticated
-- users closes anonymous scraping with no app-facing change.
--
-- (Further hardening to consider separately: birthdate is readable by ALL
-- authenticated users via `select('*')`. Restricting per-column needs a view or
-- column privileges and touches the client's profile queries, so it's left as a
-- follow-up rather than bundled here.)

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;

CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Refresh PostgREST schema cache so the change is live immediately.
NOTIFY pgrst, 'reload schema';
