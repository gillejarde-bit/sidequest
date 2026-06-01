-- 014_fix_calendar_joins.sql
-- Fix get_calendar_quests, get_my_quests, and get_quest_detail to use LEFT JOIN on locations so quests without exact locations appear properly in all views.

CREATE OR REPLACE FUNCTION public.get_calendar_quests(
  p_start timestamptz,
  p_end timestamptz
)
RETURNS TABLE (
  id uuid,
  name text,
  category text,
  vibe text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text,
  location_name text,
  creator_username text,
  my_status text,
  attendee_count bigint,
  is_group_quest bool,
  group_name text,
  group_color text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    q.id, q.name, q.category, q.vibe,
    q.starts_at, q.ends_at, q.status,
    l.name as location_name,
    p.username as creator_username,
    my_invite.status as my_status,
    COUNT(DISTINCT qi.user_id) 
      FILTER (WHERE qi.status = 'accepted') 
      as attendee_count,
    q.is_group_quest,
    g.name as group_name,
    g.group_color
  FROM public.quests q
  LEFT JOIN public.locations l ON l.id = q.location_id
  JOIN public.profiles p ON p.id = q.creator_id
  LEFT JOIN public.quest_invites qi ON qi.quest_id = q.id
  LEFT JOIN public.quest_invites my_invite 
    ON my_invite.quest_id = q.id 
    AND my_invite.user_id = auth.uid()
  LEFT JOIN public.quest_groups g ON g.id = q.group_id
  WHERE q.starts_at >= p_start
    AND q.starts_at <= p_end
    AND (
      q.creator_id = auth.uid()
      OR my_invite.user_id = auth.uid()
    )
  GROUP BY q.id, l.name, p.username, 
    my_invite.status, g.name, g.group_color
  ORDER BY q.starts_at ASC
$$;

GRANT EXECUTE ON FUNCTION public.get_calendar_quests TO authenticated;


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
  LEFT JOIN public.locations l ON l.id = q.location_id
  JOIN public.profiles p ON p.id = q.creator_id
  LEFT JOIN public.quest_invites qi2 ON qi2.quest_id = q.id
  LEFT JOIN public.quest_invites my_invite 
    ON my_invite.quest_id = q.id 
    AND my_invite.user_id = auth.uid()
  WHERE (
    q.creator_id = auth.uid()
    OR my_invite.user_id = auth.uid()
    OR q.privacy = 'public'
  )
  AND (filter_status IS NULL OR q.status = filter_status)
  GROUP BY q.id, q.name, q.category, q.vibe,
    q.starts_at, q.cost_tier, q.status,
    l.name, l.geo, p.username, p.avatar_url,
    my_invite.status
  ORDER BY q.starts_at ASC
$$;

GRANT EXECUTE ON FUNCTION public.get_my_quests TO authenticated;


CREATE OR REPLACE FUNCTION public.get_quest_detail(quest_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'quest', row_to_json(q),
      'location', CASE 
        WHEN l.id IS NOT NULL THEN json_build_object(
          'id', l.id,
          'name', l.name,
          'address', l.address,
          'lat', ST_Y(l.geo::geometry),
          'lng', ST_X(l.geo::geometry)
        )
        ELSE NULL
      END,
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
    LEFT JOIN public.locations l ON l.id = q.location_id
    JOIN public.profiles creator ON creator.id = q.creator_id
    WHERE q.id = quest_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_quest_detail TO authenticated;
