-- Database Migration: The Campfire Activity Feed schema, RLS, ranking, and triggers

-- 1. Enable PostGIS (already enabled, but do so if absent)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Create feed_events table
CREATE TABLE IF NOT EXISTS public.feed_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  crew_id uuid REFERENCES public.quest_groups(id) ON DELETE SET NULL,
  type text NOT NULL,        -- quest_complete | foil_crown | pioneer_mint | archetype_unlock | crew_milestone | streak_milestone | streak_revived | crew_vibe_shift | gem_nominated | presence_nearby | ai_digest
  payload jsonb NOT NULL,    -- type-specific variables
  location geography(point, 4326),
  visibility text NOT NULL DEFAULT 'crew_friends' CHECK (visibility IN ('crew_only', 'crew_friends', 'public')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create indices for spatial and recency queries
CREATE INDEX IF NOT EXISTS idx_feed_events_location ON public.feed_events USING gist(location);
CREATE INDEX IF NOT EXISTS idx_feed_events_created_at ON public.feed_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_events_actor_type_created ON public.feed_events(actor_id, type, created_at DESC);

-- 4. Create feed_reactions table
CREATE TABLE IF NOT EXISTS public.feed_reactions (
  feed_event_id uuid REFERENCES public.feed_events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('flame', 'gem', 'paw')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (feed_event_id, user_id, kind)
);

-- 5. Create feed_weights table
CREATE TABLE IF NOT EXISTS public.feed_weights (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  w_recency numeric DEFAULT 1.0,
  w_proximity numeric DEFAULT 0.6,
  w_affinity numeric DEFAULT 0.8,
  w_rarity numeric DEFAULT 0.7,
  recency_halflife_hours numeric DEFAULT 18
);

-- Seed initial weights
INSERT INTO public.feed_weights (id, w_recency, w_proximity, w_affinity, w_rarity, recency_halflife_hours)
VALUES (1, 1.0, 0.6, 0.8, 0.7, 18.0)
ON CONFLICT (id) DO NOTHING;

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.feed_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_weights ENABLE ROW LEVEL SECURITY;

-- 7. Define RLS Policies for feed_events
DROP POLICY IF EXISTS "feed_events select policy" ON public.feed_events;
CREATE POLICY "feed_events select policy" ON public.feed_events
    FOR SELECT TO authenticated
    USING (
        visibility = 'public'
        OR actor_id = auth.uid()
        -- Crew only visibility: user belongs to the crew group
        OR (
            visibility = 'crew_only'
            AND crew_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.group_members gm
                WHERE gm.group_id = feed_events.crew_id AND gm.user_id = auth.uid()
            )
        )
        -- Crew friends visibility: same crew group OR friends with actor
        OR (
            visibility = 'crew_friends'
            AND (
                (crew_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM public.group_members gm
                    WHERE gm.group_id = feed_events.crew_id AND gm.user_id = auth.uid()
                ))
                OR EXISTS (
                    SELECT 1 FROM public.friendships f
                    WHERE f.status = 'accepted'
                    AND ((f.user_id = auth.uid() AND f.friend_id = actor_id)
                      OR (f.friend_id = auth.uid() AND f.user_id = actor_id))
                )
            )
        )
    );

DROP POLICY IF EXISTS "feed_events insert policy" ON public.feed_events;
CREATE POLICY "feed_events insert policy" ON public.feed_events
    FOR INSERT TO authenticated
    WITH CHECK (actor_id = auth.uid());

-- 8. Define RLS Policies for feed_reactions
DROP POLICY IF EXISTS "feed_reactions select policy" ON public.feed_reactions;
CREATE POLICY "feed_reactions select policy" ON public.feed_reactions
    FOR SELECT TO authenticated
    USING (true); -- Anyone authenticated can view reactions count / details

DROP POLICY IF EXISTS "feed_reactions insert policy" ON public.feed_reactions;
CREATE POLICY "feed_reactions insert policy" ON public.feed_reactions
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "feed_reactions delete policy" ON public.feed_reactions;
CREATE POLICY "feed_reactions delete policy" ON public.feed_reactions
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- 9. Define RLS Policies for feed_weights
DROP POLICY IF EXISTS "feed_weights select policy" ON public.feed_weights;
CREATE POLICY "feed_weights select policy" ON public.feed_weights
    FOR SELECT TO authenticated
    USING (true);

-- 10. Implement get_feed scoring function
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
  SELECT lat, lng INTO v_viewer_lat, v_viewer_lng
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
          ELSE 0.2 -- presence_nearby | gem_nominated | ai_digest
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
  -- Gate reads via RLS rules or inline filters for speed
  WHERE (p_cursor IS NULL OR fe.created_at < p_cursor)
  ORDER BY fe.created_at DESC -- Keyset cursor ordering
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_feed TO authenticated;


-- 11. Trigger Functions for Automatic Social Feed Event Emission

-- 11.1 Check-in / Stamp trigger
CREATE OR REPLACE FUNCTION public.emit_stamp_feed_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quest public.quests%ROWTYPE;
  v_location public.locations%ROWTYPE;
  v_payload jsonb;
  v_visibility text := 'crew_friends';
  v_location_point geography(point);
BEGIN
  -- Fetch quest details
  SELECT * INTO v_quest FROM public.quests WHERE id = NEW.quest_id;
  IF v_quest.id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Map privacy to visibility
  IF v_quest.privacy = 'public' THEN
    v_visibility := 'public';
  ELSIF v_quest.privacy = 'group' THEN
    v_visibility := 'crew_only';
  END IF;

  -- Fetch location
  SELECT * INTO v_location FROM public.locations WHERE id = v_quest.location_id;
  IF v_location.id IS NOT NULL THEN
    v_location_point := v_location.geo;
  END IF;

  -- Deduplicate / collapse multiple check-ins on same quest per actor per day
  IF EXISTS (
    SELECT 1 FROM public.feed_events
    WHERE actor_id = NEW.user_id 
      AND type = 'quest_complete'
      AND (payload->>'quest_id') = NEW.quest_id::text
      AND created_at > now() - interval '1 day'
  ) THEN
    -- Update existing count instead of double insert
    UPDATE public.feed_events
    SET payload = jsonb_set(payload, '{count}', ((payload->>'count')::int + 1)::text::jsonb),
        created_at = now()
    WHERE actor_id = NEW.user_id 
      AND type = 'quest_complete'
      AND (payload->>'quest_id') = NEW.quest_id::text;
  ELSE
    -- Emit quest completed event
    v_payload := jsonb_build_object(
      'quest_id', NEW.quest_id,
      'quest_name', v_quest.name,
      'location_name', v_location.name,
      'category', v_quest.category,
      'district', NEW.district,
      'count', 1
    );

    INSERT INTO public.feed_events (actor_id, crew_id, type, payload, location, visibility, created_at)
    VALUES (NEW.user_id, v_quest.group_id, 'quest_complete', v_payload, v_location_point, v_visibility, NEW.earned_at);
  END IF;

  -- If it is a Pioneer Mint
  IF NEW.is_pioneer THEN
    v_payload := jsonb_build_object(
      'quest_id', NEW.quest_id,
      'quest_name', v_quest.name,
      'location_name', v_location.name,
      'district', NEW.district
    );
    INSERT INTO public.feed_events (actor_id, crew_id, type, payload, location, visibility, created_at)
    VALUES (NEW.user_id, v_quest.group_id, 'pioneer_mint', v_payload, v_location_point, v_visibility, NEW.earned_at);
  END IF;

  -- If it is a Foil Crown
  IF NEW.is_foil THEN
    v_payload := jsonb_build_object(
      'quest_id', NEW.quest_id,
      'quest_name', v_quest.name,
      'location_name', v_location.name,
      'category', NEW.stamp_kind
    );
    INSERT INTO public.feed_events (actor_id, crew_id, type, payload, location, visibility, created_at)
    VALUES (NEW.user_id, v_quest.group_id, 'foil_crown', v_payload, v_location_point, v_visibility, NEW.earned_at);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_stamp_feed_event ON public.quest_stamps;
CREATE TRIGGER tr_stamp_feed_event
AFTER INSERT ON public.quest_stamps
FOR EACH ROW
EXECUTE FUNCTION public.emit_stamp_feed_event();


-- 11.2 Gem Nomination trigger
CREATE OR REPLACE FUNCTION public.emit_gem_feed_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payload jsonb;
BEGIN
  IF NEW.is_hidden_gem = true AND NEW.nominated_by IS NOT NULL THEN
    v_payload := jsonb_build_object(
      'gem_id', NEW.id,
      'gem_name', NEW.name,
      'category', NEW.category,
      'description', NEW.description
    );
    INSERT INTO public.feed_events (actor_id, type, payload, location, visibility)
    VALUES (NEW.nominated_by, 'gem_nominated', v_payload, NEW.geo, 'public');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_gem_feed_event ON public.locations;
CREATE TRIGGER tr_gem_feed_event
AFTER INSERT ON public.locations
FOR EACH ROW
EXECUTE FUNCTION public.emit_gem_feed_event();


-- 11.3 Profile level-up milestone trigger
CREATE OR REPLACE FUNCTION public.emit_profile_feed_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payload jsonb;
BEGIN
  -- If user level increases
  IF OLD.level IS NOT NULL AND NEW.level > OLD.level THEN
    v_payload := jsonb_build_object(
      'level', NEW.level,
      'xp', NEW.xp
    );
    INSERT INTO public.feed_events (actor_id, type, payload, visibility)
    VALUES (NEW.id, 'archetype_unlock', v_payload, 'crew_friends');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_profile_feed_event ON public.profiles;
CREATE TRIGGER tr_profile_feed_event
AFTER UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.emit_profile_feed_event();


-- 11.4 Crew milestones & Streaks trigger
CREATE OR REPLACE FUNCTION public.emit_crew_feed_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payload jsonb;
  v_creator_id uuid;
BEGIN
  -- Resolve actor_id for group actions
  v_creator_id := NEW.created_by;
  IF v_creator_id IS NULL THEN
    -- Fallback to group creator or first member
    SELECT user_id INTO v_creator_id FROM public.group_members WHERE group_id = NEW.id LIMIT 1;
  END IF;

  IF v_creator_id IS NOT NULL THEN
    -- A. Streak Milestone (when streak is updated and exceeds previous)
    IF OLD.streak IS NOT NULL AND NEW.streak > OLD.streak AND (NEW.streak % 5 = 0 OR NEW.streak = 3) THEN
      v_payload := jsonb_build_object(
        'group_id', NEW.id,
        'group_name', NEW.name,
        'streak', NEW.streak
      );
      INSERT INTO public.feed_events (actor_id, crew_id, type, payload, visibility)
      VALUES (v_creator_id, NEW.id, 'streak_milestone', v_payload, 'crew_only');
    END IF;

    -- B. Streak Revived (when freeze or life restores streak)
    IF OLD.streak_frozen = true AND NEW.streak_frozen = false THEN
      v_payload := jsonb_build_object(
        'group_id', NEW.id,
        'group_name', NEW.name,
        'text', 'Streak revived and kept alive!'
      );
      INSERT INTO public.feed_events (actor_id, crew_id, type, payload, visibility)
      VALUES (v_creator_id, NEW.id, 'streak_revived', v_payload, 'crew_only');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_crew_feed_event ON public.quest_groups;
CREATE TRIGGER tr_crew_feed_event
AFTER UPDATE ON public.quest_groups
FOR EACH ROW
EXECUTE FUNCTION public.emit_crew_feed_event();

-- Force PostgREST schema cache to reload
NOTIFY pgrst, 'reload schema';
