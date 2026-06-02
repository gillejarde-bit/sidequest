-- Database Migration: Repair check_in_to_quest() function schema collision
-- This overwrites the outdated check-in logic that referenced the non-existent 'status' column on quest_attendance

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
  -- 1. Fetch the target quest
  SELECT * INTO v_quest FROM public.quests WHERE id = p_quest_id;

  IF v_quest.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'quest_not_found');
  END IF;

  -- 2. Block check-ins for non-active or non-planned quests (XP exploit checks)
  IF v_quest.status NOT IN ('planned', 'active') THEN
    RETURN json_build_object('success', false, 'error', 'quest_not_active');
  END IF;

  -- 3. Enforce check-in window constraint: only starting 1 hour before and up to 4 hours after quest starts
  IF now() < v_quest.starts_at - interval '1 hour' THEN
    RETURN json_build_object('success', false, 'error', 'too_early', 'starts_at', v_quest.starts_at);
  END IF;
  
  IF now() > v_quest.starts_at + interval '4 hours' THEN
    RETURN json_build_object('success', false, 'error', 'too_late');
  END IF;

  -- 4. Calculate distance to quest coordinate using PostGIS ST_Distance
  SELECT ST_Distance(
    (SELECT geo FROM public.locations WHERE id = v_quest.location_id),
    ST_Point(p_lng, p_lat)::geography
  ) INTO v_distance;

  -- 5. Verify distance limits (too far simply returns an error; does NOT break streaks!)
  IF v_distance > 500 THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'too_far',
      'distance', v_distance
    );
  END IF;

  -- 6. Verify duplicate check-in
  SELECT EXISTS(
    SELECT 1 FROM public.quest_attendance
    WHERE quest_id = p_quest_id AND user_id = auth.uid()
  ) INTO v_already_attended;

  IF v_already_attended THEN
    RETURN json_build_object('success', false, 'error', 'already_checked_in');
  END IF;

  -- 7. Record attendance (correct columns only!)
  INSERT INTO public.quest_attendance (quest_id, user_id, arrived_at)
  VALUES (p_quest_id, auth.uid(), now());

  -- 8. Pioneer Check: check if the user is the first ever to attend this location
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

  -- 9. Regular check-in XP
  INSERT INTO public.xp_events (user_id, action_type, points, reference_id, reference_type)
  VALUES (auth.uid(), 'check_in', 20, p_quest_id, 'quest');
  v_xp_awarded := v_xp_awarded + 20;

  -- Update profiles XP
  UPDATE public.profiles SET xp = xp + 20 WHERE id = auth.uid();

  -- 10. Streak update logic
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

  -- 11. Update level bounds
  UPDATE public.profiles
  SET level = floor(sqrt(xp / 100.0)) + 1
  WHERE id = auth.uid();

  -- 12. Return success results block
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

-- Force PostgREST schema cache to reload
NOTIFY pgrst, 'reload schema';
