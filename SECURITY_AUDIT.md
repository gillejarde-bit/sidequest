# SideQuest — Security Audit (2026-06-13)

Scope: the two fix-sheet "check TODAY" blockers — (1) service_role key must not be
in the client bundle, (2) RLS on every table — plus a sweep of the RLS policies.

## ✅ service_role key — NOT exposed
- `lib/supabase.ts` uses only `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
- No `service_role` reference anywhere in `apps/web/src`, the repo, or the built `dist/`.
- `.env.local` defines only `VITE_`-prefixed keys (URL, anon, Mapbox token/style,
  Google Maps key). Vite only bundles `VITE_`-prefixed vars, and no service key exists.
- **Verdict: safe.** Only the anon key reaches the browser, which is correct.

## ✅ RLS — enabled, and mostly well-scoped
RLS is enabled on every sensitive table. Key policies:
- **`user_coverage` (fog/exploration — the privacy moat):** owner-only for
  SELECT/INSERT/DELETE (`auth.uid() = user_id`). Migration 029. ✔
- **`user_locations`:** SELECT scoped to self + accepted friends (migration 013,
  replacing an earlier "all locations"). ✔
- **`quests` / `quest_invites`:** migration 013 dropped the old `USING (true)`
  policies and replaced them with privacy-aware ones (public / creator / invited /
  friends / group). `get_quest_detail()` RPC also does an explicit auth check. ✔
- **`quest_invites` INSERT:** migration 020 allows the creator to invite others and
  users to RSVP themselves into public/group/friends quests. (This is why the
  "Follow Trail" fix — upserting the viewer — works and fails gracefully on quests
  you can't join.) ✔
- **check-in RPC:** validates distance ≤ 500 m, quest status, and duplicate check-in
  (partial anti-cheat; server-side speed/teleport validation is still a TODO). ✔

## ⚠ One gap fixed — `profiles` was world/anon-readable
`profiles` SELECT was still `USING (true)` from migration 002 (no role limit), so the
public anon key could dump every profile (incl. `birthdate`) without logging in.
**Fix:** migration `030_profiles_select_scope.sql` scopes SELECT to `authenticated`.
Safe because every route is behind `requireAuth` (no pre-auth profile reads).
→ **Action: run `030` against your Supabase** (`supabase db push` or paste in SQL editor).

## Recommendations (not auto-changed — review first)
- **birthdate column exposure:** even authenticated users can read other users'
  `birthdate` via `select('*')`. Consider a public-safe view or column privileges.
- **Google Maps key** (`VITE_GOOGLE_MAPS_KEY`) is necessarily in the client bundle —
  add HTTP-referrer restrictions in Google Cloud Console and rotate it (it was shared
  in plaintext during handoff, per PROJECT_PLAN).
- Benign blanket reads remain on social tables (`feed_reactions`, `group_members`) —
  acceptable for authenticated social visibility; revisit if profiles should be more
  private.
