-- 006_fix_detail.sql

CREATE OR REPLACE FUNCTION get_quest_detail(quest_id uuid)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
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
