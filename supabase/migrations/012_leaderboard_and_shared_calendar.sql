-- Migration 012: Leaderboard and Shared Calendars

-- 1. Add calendar sharing preference to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS calendar_visibility text DEFAULT 'friends';

-- 2. CREATE or REPLACE public.get_leaderboards() function
CREATE OR REPLACE FUNCTION public.get_leaderboards()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'personal_streaks', COALESCE((
      SELECT json_agg(row_to_json(p)) FROM (
        SELECT
          pr.id, pr.username, pr.display_name,
          pr.avatar_url, pr.level,
          pr.current_streak, pr.longest_streak
        FROM public.profiles pr
        WHERE pr.current_streak > 0
        ORDER BY pr.current_streak DESC, pr.display_name ASC
        LIMIT 50
      ) p
    ), '[]'::json),
    'group_streaks', COALESCE((
      SELECT json_agg(row_to_json(g)) FROM (
        SELECT
          qg.id, qg.name, qg.group_color,
          qg.avatar_url, qg.streak,
          qg.longest_streak, qg.member_count
        FROM public.quest_groups qg
        WHERE qg.streak > 0
        ORDER BY qg.streak DESC, qg.name ASC
        LIMIT 50
      ) g
    ), '[]'::json),
    'my_rank_personal', COALESCE((
      SELECT COUNT(*) + 1 FROM public.profiles
      WHERE current_streak > COALESCE((
        SELECT current_streak FROM public.profiles
        WHERE id = auth.uid()
      ), 0)
    ), 1)
  )
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboards TO authenticated;

-- 3. CREATE or REPLACE public.get_friend_calendar() function
CREATE OR REPLACE FUNCTION public.get_friend_calendar(
  p_friend_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_visibility text;
  v_is_friend boolean;
BEGIN
  -- Get the target user's calendar visibility preference
  SELECT calendar_visibility INTO v_visibility
  FROM public.profiles WHERE id = p_friend_id;

  -- Default visibility to 'friends' if null
  IF v_visibility IS NULL THEN
    v_visibility := 'friends';
  END IF;

  -- Check if they are accepted friends
  SELECT EXISTS(
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
    AND ((user_id = auth.uid() AND friend_id = p_friend_id)
      OR (friend_id = auth.uid() AND user_id = p_friend_id))
  ) INTO v_is_friend;

  -- Handle privacy checks
  IF v_visibility = 'private' THEN
    RETURN json_build_object('error', 'private');
  END IF;
  
  IF v_visibility = 'friends' AND NOT v_is_friend AND auth.uid() != p_friend_id THEN
    RETURN json_build_object('error', 'not_friends');
  END IF;

  -- Return busy blocks
  RETURN json_build_object(
    'visibility', v_visibility,
    'busy_blocks', COALESCE((
      SELECT json_agg(json_build_object(
        'starts_at', q.starts_at,
        'ends_at', q.ends_at,
        'name', CASE WHEN (v_is_friend OR auth.uid() = p_friend_id)
                THEN q.name ELSE 'Busy' END,
        'category', CASE WHEN (v_is_friend OR auth.uid() = p_friend_id)
                    THEN q.category ELSE NULL END
      ))
      FROM public.quests q
      JOIN public.quest_invites qi ON qi.quest_id = q.id
      WHERE qi.user_id = p_friend_id
      AND qi.status = 'accepted'
      AND q.starts_at >= p_start
      AND q.starts_at <= p_end
    ), '[]'::json)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_friend_calendar TO authenticated;
