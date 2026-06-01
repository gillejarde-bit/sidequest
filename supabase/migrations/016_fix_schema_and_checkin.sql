-- Migration 016: Repair Schema Cache and Scoped Check-in Adjustments

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

ALTER TABLE public.quest_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Scoped SELECT policies for quest_groups
DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.quest_groups;
CREATE POLICY "Users can view groups they belong to" ON public.quest_groups
  FOR SELECT USING (
    id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Anyone can create a group" ON public.quest_groups;
CREATE POLICY "Anyone can create a group" ON public.quest_groups
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Group creators can update their groups" ON public.quest_groups;
CREATE POLICY "Group creators can update their groups" ON public.quest_groups
  FOR UPDATE USING (
    created_by = auth.uid()
  );

-- Scoped SELECT policies for group_members
DROP POLICY IF EXISTS "Users can view members of their groups" ON public.group_members;
CREATE POLICY "Users can view members of their groups" ON public.group_members
  FOR SELECT USING (
    group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Anyone can join a group" ON public.group_members;
CREATE POLICY "Anyone can join a group" ON public.group_members
  FOR INSERT WITH CHECK (true);


-- 2. Refine check_in_to_quest() to prevent automatic streak breaks when too far
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

  -- Verify distance limits (too far = simply returns error, does NOT break streak immediately!)
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


-- 3. Update get_quest_detail() to include check-in status (has_attended) for attendees
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
          'status', qi.status,
          'has_attended', EXISTS(
            SELECT 1 FROM public.quest_attendance qa
            WHERE qa.quest_id = q.id AND qa.user_id = p.id
          )
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
GRANT EXECUTE ON FUNCTION public.get_quest_detail TO authenticated;
