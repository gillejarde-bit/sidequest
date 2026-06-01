-- Migration 013: Security Hardening & Bug Fixes

-- 1. user_locations Table SELECT Policy Scoping
DROP POLICY IF EXISTS "Authenticated users can select all locations" ON public.user_locations;
CREATE POLICY "Authenticated users can select all locations" ON public.user_locations
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.friendships
            WHERE status = 'accepted'
            AND ((user_id = auth.uid() AND friend_id = user_locations.user_id)
              OR (friend_id = auth.uid() AND user_id = user_locations.user_id))
        )
    );

-- 2. quest_invites INSERT Policy Scoping
DROP POLICY IF EXISTS "Users can insert invites" ON public.quest_invites;
CREATE POLICY "Users can insert invites" ON public.quest_invites
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.quests q
            WHERE q.id = quest_id AND q.creator_id = auth.uid()
        )
    );

-- 3. locations INSERT Policy Removal
DROP POLICY IF EXISTS "Authenticated users can insert locations" ON public.locations;

-- 4. quests and quest_invites SELECT Privacy Enforcement
DROP POLICY IF EXISTS "Quests are viewable by everyone" ON public.quests;
CREATE POLICY "Quests are viewable by everyone" ON public.quests
    FOR SELECT USING (
        privacy = 'public'
        OR creator_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.quest_invites qi
            WHERE qi.quest_id = id AND qi.user_id = auth.uid()
        )
        OR (
            privacy = 'friends'
            AND EXISTS (
                SELECT 1 FROM public.friendships f
                WHERE f.status = 'accepted'
                AND ((f.user_id = auth.uid() AND f.friend_id = creator_id)
                  OR (f.friend_id = auth.uid() AND f.user_id = creator_id))
            )
        )
        OR (
            privacy = 'group'
            AND EXISTS (
                SELECT 1 FROM public.group_members gm
                WHERE gm.group_id = quests.group_id AND gm.user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Quest invites are viewable by everyone" ON public.quest_invites;
CREATE POLICY "Quest invites are viewable by everyone" ON public.quest_invites
    FOR SELECT USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.quests q
            WHERE q.id = quest_id
            AND (
                q.creator_id = auth.uid()
                OR q.privacy = 'public'
                OR (
                    q.privacy = 'friends'
                    AND EXISTS (
                        SELECT 1 FROM public.friendships f
                        WHERE f.status = 'accepted'
                        AND ((f.user_id = auth.uid() AND f.friend_id = q.creator_id)
                          OR (f.friend_id = auth.uid() AND f.user_id = q.creator_id))
                    )
                )
                OR (
                    q.privacy = 'group'
                    AND EXISTS (
                        SELECT 1 FROM public.group_members gm
                        WHERE gm.group_id = q.group_id AND gm.user_id = auth.uid()
                    )
                )
            )
        )
    );

-- 5. get_quest_detail() RPC Privacy Authorization Check
CREATE OR REPLACE FUNCTION public.get_quest_detail(quest_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quest public.quests%ROWTYPE;
  v_authorized boolean := false;
BEGIN
  -- Fetch the target quest
  SELECT * INTO v_quest FROM public.quests WHERE id = quest_id;
  
  IF v_quest.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Verify authorization based on privacy setting and associations
  IF v_quest.privacy = 'public' OR v_quest.creator_id = auth.uid() THEN
    v_authorized := true;
  END IF;

  IF NOT v_authorized AND EXISTS (
    SELECT 1 FROM public.quest_invites qi
    WHERE qi.quest_id = quest_id AND qi.user_id = auth.uid()
  ) THEN
    v_authorized := true;
  END IF;

  IF NOT v_authorized AND v_quest.privacy = 'friends' AND EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
    AND ((f.user_id = auth.uid() AND f.friend_id = v_quest.creator_id)
      OR (f.friend_id = auth.uid() AND f.user_id = v_quest.creator_id))
  ) THEN
    v_authorized := true;
  END IF;

  IF NOT v_authorized AND v_quest.privacy = 'group' AND EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = v_quest.group_id AND gm.user_id = auth.uid()
  ) THEN
    v_authorized := true;
  END IF;

  IF NOT v_authorized THEN
    RETURN json_build_object('error', 'unauthorized');
  END IF;

  -- Build and return JSON quest details block
  RETURN (
    SELECT json_build_object(
      'quest', row_to_json(q),
      'location', json_build_object(
        'id', l.id,
        'name', l.name,
        'address', l.address,
        'lat', ST_Y(l.geo::geometry),
        'lng', ST_X(l.geo::geometry)
      ),
      'creator', row_to_json(creator),
      'attendees', COALESCE((
        SELECT json_agg(json_build_object(
          'user_id', p.id,
          'username', p.username,
          'display_name', p.display_name,
          'avatar_url', p.avatar_url,
          'level', p.level,
          'status', qi.status
        ))
        FROM public.quest_invites qi
        JOIN public.profiles p ON p.id = qi.user_id
        WHERE qi.quest_id = q.id
        AND qi.status = 'accepted'
      ), '[]'::json),
      'invited', COALESCE((
        SELECT json_agg(json_build_object(
          'user_id', p.id,
          'username', p.username,
          'display_name', p.display_name,
          'avatar_url', p.avatar_url,
          'status', qi.status
        ))
        FROM public.quest_invites qi
        JOIN public.profiles p ON p.id = qi.user_id
        WHERE qi.quest_id = q.id
      ), '[]'::json),
      'my_status', (
        SELECT qi.status 
        FROM public.quest_invites qi
        WHERE qi.quest_id = q.id 
        AND qi.user_id = auth.uid()
      ),
      'attendee_count', (
        SELECT COUNT(*) 
        FROM public.quest_invites qi
        WHERE qi.quest_id = q.id 
        AND qi.status = 'accepted'
      ),
      'is_creator', (q.creator_id = auth.uid()),
      'user_attended', (
        SELECT EXISTS(
          SELECT 1 FROM public.quest_attendance qa
          WHERE qa.quest_id = q.id 
          AND qa.user_id = auth.uid()
        )
      )
    )
    FROM public.quests q
    JOIN public.locations l ON l.id = q.location_id
    JOIN public.profiles creator ON creator.id = q.creator_id
    WHERE q.id = quest_id
  );
END;
$$;

-- 6. check_in_to_quest() Non-existent status column crash & status check fixes
CREATE OR REPLACE FUNCTION public.check_in_to_quest(
  p_quest_id uuid,
  p_lat float8,
  p_lng float8
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quest public.quests%ROWTYPE;
  v_distance float8;
  v_xp_awarded int := 0;
  v_is_pioneer boolean;
  v_already_attended boolean;
BEGIN
  -- Fetch the quest
  SELECT * INTO v_quest FROM public.quests WHERE id = p_quest_id;

  IF v_quest.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'quest_not_found');
  END IF;

  -- Block check-ins for non-active or non-planned quests (XP exploit check)
  IF v_quest.status NOT IN ('planned', 'active') THEN
    RETURN json_build_object('success', false, 'error', 'quest_not_active');
  END IF;

  -- Calculate distance to quest coordinate
  SELECT ST_Distance(
    (SELECT geo FROM public.locations WHERE id = v_quest.location_id),
    ST_Point(p_lng, p_lat)::geography
  ) INTO v_distance;

  IF v_distance > 500 THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'too_far',
      'distance', v_distance
    );
  END IF;

  -- Verify duplicate check-in
  SELECT EXISTS(
    SELECT 1 FROM public.quest_attendance
    WHERE quest_id = p_quest_id AND user_id = auth.uid()
  ) INTO v_already_attended;

  IF v_already_attended THEN
    RETURN json_build_object('success', false, 'error', 'already_checked_in');
  END IF;

  -- Record attendance correctly (WITHOUT referencing non-existent 'status' column!)
  INSERT INTO public.quest_attendance (quest_id, user_id, arrived_at)
  VALUES (p_quest_id, auth.uid(), now());

  -- Pioneer Check
  SELECT NOT EXISTS(
    SELECT 1 FROM public.quest_attendance qa2
    JOIN public.quests q2 ON q2.id = qa2.quest_id
    WHERE q2.location_id = v_quest.location_id
    AND qa2.user_id != auth.uid()
    AND qa2.arrived_at < now()
  ) INTO v_is_pioneer;

  IF v_is_pioneer THEN
    INSERT INTO public.xp_events (user_id, action_type, points, reference_id, reference_type)
    VALUES (auth.uid(), 'pioneer_location', 25, p_quest_id, 'quest');
    
    UPDATE public.profiles SET xp = xp + 25 WHERE id = auth.uid();
    v_xp_awarded := v_xp_awarded + 25;
  END IF;

  -- Regular checkin XP
  INSERT INTO public.xp_events (user_id, action_type, points, reference_id, reference_type)
  VALUES (auth.uid(), 'check_in', 20, p_quest_id, 'quest');

  UPDATE public.profiles
  SET xp = xp + 20,
      level = floor(sqrt((xp + 20) / 100.0)) + 1
  WHERE id = auth.uid();

  v_xp_awarded := v_xp_awarded + 20;

  RETURN json_build_object(
    'success', true,
    'xp_awarded', v_xp_awarded,
    'distance', v_distance,
    'is_pioneer', v_is_pioneer
  );
END;
$$;

-- 7. Create gems Storage Bucket and RLS Policies
INSERT INTO storage.buckets (id, name, public) 
VALUES ('gems', 'gems', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Gems images are publicly accessible" ON storage.objects;
CREATE POLICY "Gems images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'gems');

DROP POLICY IF EXISTS "Authenticated users can upload gem images" ON storage.objects;
CREATE POLICY "Authenticated users can upload gem images" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'gems');

-- 8. handle_new_user() Trigger Username Collision Fix
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    -- Guarantee unique username by appending the first 8 characters of their UUID
    COALESCE(SPLIT_PART(NEW.email, '@', 1), 'user') || '_' || substr(NEW.id::text, 1, 8),
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
