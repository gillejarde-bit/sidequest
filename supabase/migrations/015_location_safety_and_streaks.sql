-- Migration 015: Location Safety, Secure Quest Privacy, and Streak Heart Recovery System

-- 1. Add location privacy and RPG lives/streaks fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS share_location boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location_sharing_scope text DEFAULT 'friends' CHECK (location_sharing_scope IN ('friends', 'crews', 'nearby'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lives int DEFAULT 3 CHECK (lives >= 0 AND lives <= 3);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS previous_streak int DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak_last_active_date date;

-- Default existing rows
UPDATE public.profiles SET share_location = false WHERE share_location IS NULL;
UPDATE public.profiles SET location_sharing_scope = 'friends' WHERE location_sharing_scope IS NULL;
UPDATE public.profiles SET lives = 3 WHERE lives IS NULL;
UPDATE public.profiles SET previous_streak = 0 WHERE previous_streak IS NULL;

-- 2. Scoped SELECT policy for quests: Only creator, invitees, accepted friends, or crew members can see quests!
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

-- 3. Replace get_my_quests() RPC function to filter out non-friend / non-crew quests
CREATE OR REPLACE FUNCTION public.get_my_quests(
  filter_status text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  category text,
  vibe text,
  starts_at timestamptz,
  cost_tier int,
  status text,
  location_name text,
  location_lat float8,
  location_lng float8,
  creator_username text,
  creator_avatar text,
  attendee_count bigint,
  my_status text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    q.id, q.name, q.category, q.vibe,
    q.starts_at, q.cost_tier, q.status,
    l.name as location_name,
    ST_Y(l.geo::geometry) as location_lat,
    ST_X(l.geo::geometry) as location_lng,
    p.username as creator_username,
    p.avatar_url as creator_avatar,
    COUNT(DISTINCT qi2.user_id) 
      FILTER (WHERE qi2.status = 'accepted') 
      as attendee_count,
    my_invite.status as my_status
  FROM public.quests q
  JOIN public.locations l ON l.id = q.location_id
  JOIN public.profiles p ON p.id = q.creator_id
  LEFT JOIN public.quest_invites qi2 ON qi2.quest_id = q.id
  LEFT JOIN public.quest_invites my_invite 
    ON my_invite.quest_id = q.id 
    AND my_invite.user_id = auth.uid()
  WHERE (
    q.creator_id = auth.uid()
    OR my_invite.user_id = auth.uid()
    -- Friends check:
    OR EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
      AND ((f.user_id = auth.uid() AND f.friend_id = q.creator_id)
        OR (f.friend_id = auth.uid() AND f.user_id = q.creator_id))
    )
    -- Group/Crew check:
    OR (
      q.is_group_quest = true
      AND EXISTS (
        SELECT 1 FROM public.group_members gm
        WHERE gm.group_id = q.group_id AND gm.user_id = auth.uid()
      )
    )
  )
  AND (filter_status IS NULL OR q.status = filter_status)
  GROUP BY q.id, q.name, q.category, q.vibe,
    q.starts_at, q.cost_tier, q.status,
    l.name, l.geo, p.username, p.avatar_url,
    my_invite.status
  ORDER BY q.starts_at ASC
$$;
GRANT EXECUTE ON FUNCTION public.get_my_quests TO authenticated;

-- 4. Replace check_in_to_quest() with 1-hour window verification, arg fix, and streak updates
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
  v_streak_last_active date;
  v_current_streak int;
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

  -- Enforce check-in window constraint: only starting 1 hour before and up to 4 hours after quest starts
  IF now() < v_quest.starts_at - interval '1 hour' THEN
    RETURN json_build_object('success', false, 'error', 'too_early', 'starts_at', v_quest.starts_at);
  END IF;
  
  IF now() > v_quest.starts_at + interval '4 hours' THEN
    RETURN json_build_object('success', false, 'error', 'too_late');
  END IF;

  -- Calculate distance to quest coordinate
  SELECT ST_Distance(
    (SELECT geo FROM public.locations WHERE id = v_quest.location_id),
    ST_Point(p_lng, p_lat)::geography
  ) INTO v_distance;

  -- Verify distance limits (too far = breaks streak!)
  IF v_distance > 500 THEN
    -- Save current streak to previous_streak, set current_streak to 0
    UPDATE public.profiles
    SET previous_streak = current_streak,
        current_streak = 0
    WHERE id = auth.uid();

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

  -- Record attendance
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
  v_xp_awarded := v_xp_awarded + 20;

  -- Update profiles XP
  UPDATE public.profiles SET xp = xp + 20 WHERE id = auth.uid();

  -- Streak update logic
  SELECT streak_last_active_date, current_streak INTO v_streak_last_active, v_current_streak
  FROM public.profiles WHERE id = auth.uid();

  IF v_streak_last_active IS NULL OR v_streak_last_active < CURRENT_DATE THEN
    UPDATE public.profiles
    SET previous_streak = current_streak,
        current_streak = current_streak + 1,
        longest_streak = GREATEST(longest_streak, current_streak + 1),
        streak_last_active_date = CURRENT_DATE
    WHERE id = auth.uid();
    v_current_streak := v_current_streak + 1;
  END IF;

  -- Update level
  UPDATE public.profiles
  SET level = floor(sqrt(xp / 100.0)) + 1
  WHERE id = auth.uid();

  RETURN json_build_object(
    'success', true,
    'xp_awarded', v_xp_awarded,
    'distance', v_distance,
    'is_pioneer', v_is_pioneer,
    'current_streak', v_current_streak
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.check_in_to_quest TO authenticated;

-- 5. Create restore_streak_with_life() RPC function
CREATE OR REPLACE FUNCTION public.restore_streak_with_life()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lives int;
  v_prev int;
BEGIN
  SELECT lives, previous_streak INTO v_lives, v_prev
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_lives <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'no_lives_remaining');
  END IF;

  IF v_prev <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'no_streak_to_restore');
  END IF;

  UPDATE public.profiles
  SET lives = lives - 1,
      current_streak = previous_streak,
      previous_streak = 0
  WHERE id = auth.uid();

  RETURN json_build_object(
    'success', true, 
    'new_lives', v_lives - 1, 
    'restored_streak', v_prev
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.restore_streak_with_life TO authenticated;
