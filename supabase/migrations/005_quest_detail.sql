-- 005_quest_detail.sql

-- 1. Enable Realtime on these tables:
ALTER PUBLICATION supabase_realtime ADD TABLE quest_invites;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE quest_attendance;

-- 2. RPC: get full quest detail with all relations
CREATE OR REPLACE FUNCTION get_quest_detail(quest_id uuid)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'quest', row_to_json(q),
    'location', row_to_json(l),
    'creator', row_to_json(creator),
    'attendees', (
      SELECT json_agg(json_build_object(
        'user_id', p.id,
        'username', p.username,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url,
        'level', p.level,
        'status', qi.status
      ))
      FROM quest_invites qi
      JOIN profiles p ON p.id = qi.user_id
      WHERE qi.quest_id = q.id
      AND qi.status = 'accepted'
    ),
    'invited', (
      SELECT json_agg(json_build_object(
        'user_id', p.id,
        'username', p.username,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url,
        'status', qi.status
      ))
      FROM quest_invites qi
      JOIN profiles p ON p.id = qi.user_id
      WHERE qi.quest_id = q.id
    ),
    'my_status', (
      SELECT qi.status 
      FROM quest_invites qi
      WHERE qi.quest_id = q.id 
      AND qi.user_id = auth.uid()
    ),
    'attendee_count', (
      SELECT COUNT(*) 
      FROM quest_invites qi
      WHERE qi.quest_id = q.id 
      AND qi.status = 'accepted'
    ),
    'is_creator', (q.creator_id = auth.uid()),
    'user_attended', (
      SELECT EXISTS(
        SELECT 1 FROM quest_attendance qa
        WHERE qa.quest_id = q.id 
        AND qa.user_id = auth.uid()
      )
    )
  )
  FROM quests q
  JOIN locations l ON l.id = q.location_id
  JOIN profiles creator ON creator.id = q.creator_id
  WHERE q.id = quest_id
$$;
GRANT EXECUTE ON FUNCTION get_quest_detail TO authenticated;

-- 3. RPC: get quests for current user (feed)
CREATE OR REPLACE FUNCTION get_my_quests(
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
  FROM quests q
  JOIN locations l ON l.id = q.location_id
  JOIN profiles p ON p.id = q.creator_id
  LEFT JOIN quest_invites qi2 ON qi2.quest_id = q.id
  LEFT JOIN quest_invites my_invite 
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
GRANT EXECUTE ON FUNCTION get_my_quests TO authenticated;

-- 4. Function to check in to a quest (attendance)
CREATE OR REPLACE FUNCTION check_in_to_quest(
  p_quest_id uuid,
  p_user_lat float8,
  p_user_lng float8
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quest_location geography;
  v_distance float8;
  v_already_attended boolean;
  v_xp_awarded int := 20;
BEGIN
  SELECT l.geo INTO v_quest_location
  FROM quests q
  JOIN locations l ON l.id = q.location_id
  WHERE q.id = p_quest_id;

  SELECT ST_Distance(
    v_quest_location,
    ST_Point(p_user_lng, p_user_lat)::geography
  ) INTO v_distance;

  IF v_distance > 500 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'too_far',
      'distance_meters', round(v_distance)
    );
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM quest_attendance
    WHERE quest_id = p_quest_id 
    AND user_id = auth.uid()
  ) INTO v_already_attended;

  IF v_already_attended THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'already_checked_in'
    );
  END IF;

  INSERT INTO quest_attendance 
    (quest_id, user_id, arrived_at, xp_awarded)
  VALUES 
    (p_quest_id, auth.uid(), now(), false);

  INSERT INTO xp_events 
    (user_id, action_type, points, 
     reference_id, reference_type)
  VALUES 
    (auth.uid(), 'attend_quest', v_xp_awarded,
     p_quest_id, 'quest');

  UPDATE profiles 
  SET xp = xp + v_xp_awarded,
      level = floor(sqrt((xp + v_xp_awarded) / 100.0)) + 1
  WHERE id = auth.uid();

  RETURN json_build_object(
    'success', true,
    'xp_awarded', v_xp_awarded,
    'distance_meters', round(v_distance)
  );
END;
$$;
GRANT EXECUTE ON FUNCTION check_in_to_quest TO authenticated;

-- 5. RLS for chat_messages
CREATE POLICY "Quest participants can read messages"
ON chat_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM quest_invites
    WHERE quest_id = chat_messages.quest_id
    AND user_id = auth.uid()
    AND status = 'accepted'
  )
  OR EXISTS (
    SELECT 1 FROM quests
    WHERE id = chat_messages.quest_id
    AND creator_id = auth.uid()
  )
);

CREATE POLICY "Quest participants can send messages"
ON chat_messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND (
    EXISTS (
      SELECT 1 FROM quest_invites
      WHERE quest_id = chat_messages.quest_id
      AND user_id = auth.uid()
      AND status = 'accepted'
    )
    OR EXISTS (
      SELECT 1 FROM quests
      WHERE id = chat_messages.quest_id
      AND creator_id = auth.uid()
    )
  )
);
