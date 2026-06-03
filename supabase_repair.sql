-- ==============================================================================
-- SIDEQUEST UNIVERSAL SCHEMA REPAIR SCRIPT
-- ==============================================================================
-- Copy and run this script inside your Supabase Dashboard SQL Editor (https://supabase.com)
-- This script will:
-- 1. Create quest_groups & group_members tables if they do not exist
-- 2. Alter the quests table to support group quests (adds group_id & is_group_quest)
-- 3. Add group_type, xp, and level to quest_groups if they don't exist
-- 4. Add group_code to quest_groups if it doesn't exist and generate codes
-- 5. Enable RLS and re-create SELECT/INSERT policies securely for groups and members
-- 6. Fix orphaned groups (insert creator into group_members if missing)
-- 7. Secure quests table select policy (hides quests from non-friends & non-invitees)
-- 8. Rebuild the get_my_streaks RPC to include group_code
-- 9. FORCE reload the PostgREST schema cache to fix all cache staleness immediately
-- ==============================================================================

-- 1. Create quest_groups & group_members tables if they do not exist
CREATE TABLE IF NOT EXISTS public.quest_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  group_color text DEFAULT '#6C63FF',
  avatar_url text,
  streak int DEFAULT 0,
  longest_streak int DEFAULT 0,
  last_quest_at timestamptz,
  streak_frozen bool DEFAULT false,
  member_count int DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.group_members (
  group_id uuid REFERENCES public.quest_groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

-- 2. Alter quests table to support group quests if columns don't exist
ALTER TABLE public.quests ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.quest_groups(id) ON DELETE SET NULL;
ALTER TABLE public.quests ADD COLUMN IF NOT EXISTS is_group_quest bool DEFAULT false;

-- 3. Add group_type, xp, and level to quest_groups if they don't exist
ALTER TABLE public.quest_groups ADD COLUMN IF NOT EXISTS group_type text DEFAULT 'Social';
ALTER TABLE public.quest_groups ADD COLUMN IF NOT EXISTS xp integer DEFAULT 0;
ALTER TABLE public.quest_groups ADD COLUMN IF NOT EXISTS level integer DEFAULT 1;

-- 4. Add group_code to quest_groups if it doesn't exist and generate codes
CREATE OR REPLACE FUNCTION generate_random_group_code()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * 36)::integer + 1, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE public.quest_groups ADD COLUMN IF NOT EXISTS group_code text UNIQUE;

UPDATE public.quest_groups
SET group_code = generate_random_group_code()
WHERE group_code IS NULL;

-- 4.5 Create security definer function to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = p_user_id
  );
$$;

-- 5. Enable RLS
ALTER TABLE public.quest_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- 6. Re-create SELECT/INSERT policies securely for groups and members
DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.quest_groups;
CREATE POLICY "Users can view groups they belong to" ON public.quest_groups
  FOR SELECT USING (
    public.is_group_member(id, auth.uid())
    OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Anyone can create a group" ON public.quest_groups;
CREATE POLICY "Anyone can create a group" ON public.quest_groups
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Group creators can update their groups" ON public.quest_groups;
CREATE POLICY "Group creators can update their groups" ON public.quest_groups
  FOR UPDATE USING (
    created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Users can view members of their groups" ON public.group_members;
CREATE POLICY "Users can view members of their groups" ON public.group_members
  FOR SELECT USING (
    public.is_group_member(group_id, auth.uid())
  );

DROP POLICY IF EXISTS "Anyone can join a group" ON public.group_members;
CREATE POLICY "Anyone can join a group" ON public.group_members
  FOR INSERT WITH CHECK (true);

-- 6. Fix legacy orphaned groups: insert creator into group_members if not present
INSERT INTO public.group_members (group_id, user_id, role)
SELECT id, created_by, 'creator'
FROM public.quest_groups
WHERE created_by IS NOT NULL
ON CONFLICT (group_id, user_id) DO NOTHING;

-- 7. Secure quests table select policy (hides quests from non-friends & non-invitees)
DROP POLICY IF EXISTS "Quests are viewable by everyone" ON public.quests;
CREATE POLICY "Quests are viewable by everyone" ON public.quests
    FOR SELECT USING (
        creator_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.quest_invites qi
            WHERE qi.quest_id = id AND qi.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.friendships f
            WHERE f.status = 'accepted'
            AND ((f.user_id = auth.uid() AND f.friend_id = creator_id)
              OR (f.friend_id = auth.uid() AND f.user_id = creator_id))
        )
        OR (
            group_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.group_members gm
                WHERE gm.group_id = quests.group_id AND gm.user_id = auth.uid()
            )
        )
    );

-- 8. Rebuild the get_my_streaks RPC to include group_code
DROP FUNCTION IF EXISTS public.get_my_streaks();
CREATE OR REPLACE FUNCTION public.get_my_streaks()
RETURNS TABLE (
  group_id uuid,
  group_name text,
  group_color text,
  group_avatar text,
  current_streak int,
  longest_streak int,
  last_quest_at timestamptz,
  streak_frozen bool,
  member_count int,
  days_until_break int,
  next_milestone int,
  is_at_risk bool,
  group_code text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    g.id,
    g.name,
    g.group_color,
    g.avatar_url,
    g.streak,
    g.longest_streak,
    g.last_quest_at,
    g.streak_frozen,
    g.member_count,
    COALESCE(GREATEST(0, 7 - EXTRACT(DAY FROM now() - g.last_quest_at)::int), 7) as days_until_break,
    CASE
      WHEN g.streak < 3 THEN 3
      WHEN g.streak < 7 THEN 7
      WHEN g.streak < 14 THEN 14
      WHEN g.streak < 30 THEN 30
      ELSE 50
    END as next_milestone,
    COALESCE((EXTRACT(DAY FROM now() - g.last_quest_at)::int >= 5), false) as is_at_risk,
    g.group_code
  FROM public.quest_groups g
  JOIN public.group_members gm ON gm.group_id = g.id
  WHERE gm.user_id = auth.uid()
  ORDER BY g.streak DESC
$$;

GRANT EXECUTE ON FUNCTION public.get_my_streaks TO authenticated;

-- 8.5 Rebuild the get_feed RPC to resolve lat/lng ambiguity conflict
DROP FUNCTION IF EXISTS public.get_feed(uuid, int, timestamptz);
CREATE OR REPLACE FUNCTION public.get_feed(
  viewer_id uuid,
  p_limit int DEFAULT 20,
  p_cursor timestamptz DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  actor_id uuid,
  actor_username text,
  actor_display_name text,
  actor_avatar_url text,
  actor_level int,
  crew_id uuid,
  crew_name text,
  crew_color text,
  type text,
  payload jsonb,
  lat float8,
  lng float8,
  created_at timestamptz,
  score numeric,
  reactions json
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_viewer_lat float8;
  v_viewer_lng float8;
  v_w_recency numeric;
  v_w_proximity numeric;
  v_w_affinity numeric;
  v_w_rarity numeric;
  v_halflife numeric;
BEGIN
  -- 10.1 Try fetching the last known location of the viewer
  SELECT public.user_locations.lat, public.user_locations.lng INTO v_viewer_lat, v_viewer_lng
  FROM public.user_locations
  WHERE user_id = viewer_id
  ORDER BY updated_at DESC
  LIMIT 1;

  -- Default coordinates (Las Vegas center) if viewer location is unavailable
  IF v_viewer_lat IS NULL THEN
    v_viewer_lat := 36.1699;
    v_viewer_lng := -115.1398;
  END IF;

  -- 10.2 Load ranking weights
  SELECT w_recency, w_proximity, w_affinity, w_rarity, recency_halflife_hours
  INTO v_w_recency, v_w_proximity, v_w_affinity, v_w_rarity, v_halflife
  FROM public.feed_weights
  WHERE id = 1;

  RETURN QUERY
  SELECT 
    fe.id,
    fe.actor_id,
    p.username as actor_username,
    p.display_name as actor_display_name,
    p.avatar_url as actor_avatar_url,
    p.level as actor_level,
    fe.crew_id,
    cg.name as crew_name,
    cg.group_color as crew_color,
    fe.type,
    fe.payload,
    ST_Y(fe.location::geometry) as lat,
    ST_X(fe.location::geometry) as lng,
    fe.created_at,
    (
      -- A. Recency decaying score
      v_w_recency * exp(-ln(2) * (extract(epoch from (now() - fe.created_at)) / 3600.0) / v_halflife) +
      
      -- B. Proximity score (1.0 if within 3 miles [~4828 meters], decaying linearly to 0 at 15 miles [~24140 meters])
      v_w_proximity * (
        CASE
          WHEN fe.location IS NULL THEN 0.0
          ELSE
            CASE
              WHEN ST_Distance(fe.location, ST_Point(v_viewer_lng, v_viewer_lat)::geography) <= 4828 THEN 1.0
              WHEN ST_Distance(fe.location, ST_Point(v_viewer_lng, v_viewer_lat)::geography) >= 24140 THEN 0.0
              ELSE 1.0 - (ST_Distance(fe.location, ST_Point(v_viewer_lng, v_viewer_lat)::geography) - 4828) / (24140 - 4828)
            END
        END
      ) +

      -- C. Affinity score
      v_w_affinity * (
        CASE
          -- Highest affinity if same crew/group member
          WHEN fe.crew_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.group_members gm
            WHERE gm.group_id = fe.crew_id AND gm.user_id = viewer_id
          ) THEN 1.0
          -- Mutual friends
          WHEN EXISTS (
            SELECT 1 FROM public.friendships f
            WHERE f.status = 'accepted'
            AND ((f.user_id = viewer_id AND f.friend_id = fe.actor_id)
              OR (f.friend_id = viewer_id AND f.user_id = fe.actor_id))
          ) THEN 0.7
          ELSE 0.1
        END +
        -- Reaction affinity bonus (+0.2 if viewer reacted to actor in last 14 days)
        CASE
          WHEN EXISTS (
            SELECT 1 FROM public.feed_reactions fr
            JOIN public.feed_events fe2 ON fe2.id = fr.feed_event_id
            WHERE fr.user_id = viewer_id 
              AND fe2.actor_id = fe.actor_id
              AND fr.created_at > now() - interval '14 days'
          ) THEN 0.2
          ELSE 0.0
        END
      ) +

      -- D. Rarity score
      v_w_rarity * (
        CASE
          WHEN fe.type IN ('foil_crown', 'archetype_unlock', 'crew_milestone', 'crew_vibe_shift') THEN 1.0
          WHEN fe.type IN ('pioneer_mint', 'streak_milestone', 'streak_revived') THEN 0.6
          WHEN fe.type = 'quest_complete' THEN 0.3
          ELSE 0.2
        END
      )
    )::numeric as score,
    
    -- E. Nested JSON aggregation of reactions
    COALESCE(
      (
        SELECT json_agg(json_build_object('kind', fr.kind, 'user_id', fr.user_id, 'username', rp.username))
        FROM public.feed_reactions fr
        JOIN public.profiles rp ON rp.id = fr.user_id
        WHERE fr.feed_event_id = fe.id
      ),
      '[]'::json
    ) as reactions
  FROM public.feed_events fe
  JOIN public.profiles p ON p.id = fe.actor_id
  LEFT JOIN public.quest_groups cg ON cg.id = fe.crew_id
  WHERE (p_cursor IS NULL OR fe.created_at < p_cursor)
  ORDER BY fe.created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_feed TO authenticated;

-- 9. FORCE reload PostgREST schema cache to solve cache mismatches instantly
NOTIFY pgrst, 'reload schema';
